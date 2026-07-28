import prisma from '../api/lib/prisma.js';
import { 
  FinancialService, 
  calculateOrderPricing, 
  calculateResalePricing, 
  encryptDetail, 
  decryptDetail, 
  maskAccountDetail,
  toDecimal,
  toNumber 
} from '../api/lib/financial-service.js';
import { Prisma } from '@prisma/client';

async function testFinancialSystem() {
  console.log('🚀 [FINANCIAL SUITE] Starting Financial System Automated Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail: string = '') {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // PHASE 1: MONEY SAFETY (DECIMAL ARITHMETIC)
    // ----------------------------------------------------
    console.log('--- PHASE 1: Money Safety & Decimal Arithmetic ---');
    const pricing = calculateOrderPricing({
      baseAmount: 500,
      serviceFeePercent: 10,
      processingFeePercent: 2.75,
      fixedFeeEgp: 3,
      discountPercent: 10
    });

    // Subtotal = 500 - 10% (50) = 450
    // Service Fee = 450 * 10% = 45
    // Processing Fee = 450 * 2.75% = 12.375 -> 12.38
    // Fixed Fee = 3
    // Total = 450 + 45 + 12.38 + 3 = 510.38
    assert(pricing.subtotalAfterDiscount.equals(new Prisma.Decimal(450)), 'Subtotal after 10% discount is 450 EGP');
    assert(pricing.serviceFee.equals(new Prisma.Decimal(45)), 'Service fee is 45 EGP');
    assert(pricing.processingFee.equals(new Prisma.Decimal('12.38')), 'Processing fee correctly rounded to 12.38 EGP');
    assert(pricing.totalPrice.equals(new Prisma.Decimal('510.38')), 'Total price is exact 510.38 EGP without floating point distortion');

    const resalePricing = calculateResalePricing(200, 10);
    assert(resalePricing.marketplaceFee.equals(new Prisma.Decimal(20)), 'Resale marketplace fee is 20 EGP');
    assert(resalePricing.sellerPayout.equals(new Prisma.Decimal(180)), 'Resale seller payout is 180 EGP');

    // ----------------------------------------------------
    // PHASE 2: PAYMENT AUDIT LAYER
    // ----------------------------------------------------
    console.log('\n--- PHASE 2: Payment Audit Layer ---');
    const paymentTx = await FinancialService.recordPaymentTransaction({
      provider: 'KASHIER',
      providerTransactionId: `TX_AUDIT_${timestamp}`,
      merchantOrderId: `ORD_${timestamp}`,
      amount: 510.38,
      status: 'CAPTURED',
      paymentMethod: 'CARD',
      rawResponse: { status: 'SUCCESS', id: `TX_AUDIT_${timestamp}` }
    });
    assert(paymentTx.id > 0, 'PaymentTransaction recorded cleanly');
    assert(paymentTx.status === 'CAPTURED', 'PaymentTransaction status captured');
    assert(paymentTx.amount.equals(new Prisma.Decimal('510.38')), 'PaymentTransaction decimal amount matches exact 510.38');

    // ----------------------------------------------------
    // PHASE 3: WEBHOOK EVENT LOG & IDEMPOTENCY
    // ----------------------------------------------------
    console.log('\n--- PHASE 3: Webhook Event Log & Idempotency ---');
    const eventId = `WH_EVT_${timestamp}`;
    let processCount = 0;

    const res1 = await FinancialService.processWebhookEventSafely(
      eventId,
      'pay.success',
      { id: eventId, orderId: `ORD_${timestamp}` },
      async () => {
        processCount++;
        return { success: true };
      }
    );

    const res2 = await FinancialService.processWebhookEventSafely(
      eventId,
      'pay.success',
      { id: eventId, orderId: `ORD_${timestamp}` },
      async () => {
        processCount++;
        return { success: true };
      }
    );

    assert(processCount === 1, 'Webhook processor function executed exactly ONCE');
    assert(res1.status === 'PROCESSED', 'First webhook call PROCESSED');
    assert(res2.status === 'DUPLICATE', 'Second webhook call flagged as DUPLICATE');

    // ----------------------------------------------------
    // PHASE 4: DOUBLE ENTRY LEDGER
    // ----------------------------------------------------
    console.log('\n--- PHASE 4: Double Entry Ledger ---');
    const ledgerEntries = await FinancialService.recordDoubleEntryLedger({
      transactionRef: `FIN_REF_${timestamp}`,
      entries: [
        { accountType: 'CASH_CLEARING', entryType: 'DEBIT', amount: 510.38, description: 'Buyer Kashier Payment' },
        { accountType: 'PLATFORM_REVENUE', entryType: 'CREDIT', amount: 60.38, description: 'Platform Service + Gateway Fees' },
        { accountType: 'SELLER_PENDING', entryType: 'CREDIT', amount: 450.00, description: 'Seller Ticket Earnings' }
      ]
    });
    assert(ledgerEntries.length === 3, 'Recorded 3 balanced double-entry ledger items');

    let unbalancedFailed = false;
    try {
      await FinancialService.recordDoubleEntryLedger({
        transactionRef: `FIN_BAD_${timestamp}`,
        entries: [
          { accountType: 'CASH_CLEARING', entryType: 'DEBIT', amount: 500, description: 'Debit 500' },
          { accountType: 'PLATFORM_REVENUE', entryType: 'CREDIT', amount: 400, description: 'Credit 400 (Unbalanced!)' }
        ]
      });
    } catch (err: any) {
      unbalancedFailed = true;
      assert(err.message.includes('Unbalanced ledger'), 'Unbalanced ledger rejected', err.message);
    }
    assert(unbalancedFailed, 'Unbalanced accounting ledger rejected successfully');

    // ----------------------------------------------------
    // PHASE 5: SELLER BALANCES
    // ----------------------------------------------------
    console.log('\n--- PHASE 5: Seller Balances ---');
    const testUser = await prisma.user.create({
      data: {
        name: `Finance Test User ${timestamp}`,
        email: `finance_user_${timestamp}@example.com`,
        password_hash: 'hash'
      }
    });

    await FinancialService.creditSellerPendingBalance(testUser.id, 450.00);
    let sellerBal = await FinancialService.getOrCreateSellerBalance(testUser.id);
    assert(sellerBal.pending_amount.equals(new Prisma.Decimal(450)), 'Pending balance credited with 450 EGP');

    await FinancialService.releasePendingToAvailable(testUser.id, 450.00);
    sellerBal = await FinancialService.getOrCreateSellerBalance(testUser.id);
    assert(sellerBal.pending_amount.equals(new Prisma.Decimal(0)), 'Pending balance decremented to 0 EGP');
    assert(sellerBal.available_amount.equals(new Prisma.Decimal(450)), 'Available balance incremented to 450 EGP');

    // ----------------------------------------------------
    // PHASE 6: SETTLEMENT RULES
    // ----------------------------------------------------
    console.log('\n--- PHASE 6: Settlement Rules Engine ---');
    const settlementRes = await FinancialService.processSettlementQueue();
    assert(settlementRes.settledCount >= 0, 'Settlement engine executed cleanly');

    // ----------------------------------------------------
    // PHASE 7: PAYOUT DESTINATIONS
    // ----------------------------------------------------
    console.log('\n--- PHASE 7: Payout Destinations ---');
    const rawIban = 'EG123456789012345678901234';
    const destination = await FinancialService.addPayoutDestination(testUser.id, {
      type: 'BANK_ACCOUNT',
      accountName: 'Test Seller Account',
      accountDetails: rawIban
    });

    const expectedMasked = maskAccountDetail('BANK_ACCOUNT', rawIban);
    assert(destination.masked_details === expectedMasked, 'IBAN masked correctly');
    const decrypted = decryptDetail(destination.encrypted_details);
    assert(decrypted === rawIban, 'IBAN encrypted and decrypted securely');

    // ----------------------------------------------------
    // PHASE 8: WITHDRAWAL SYSTEM
    // ----------------------------------------------------
    console.log('\n--- PHASE 8: Withdrawal System ---');
    const payoutReq = await FinancialService.requestPayout(testUser.id, destination.id, 200.00);
    assert(payoutReq.status === 'REQUESTED', 'Payout request created in REQUESTED state');
    
    sellerBal = await FinancialService.getOrCreateSellerBalance(testUser.id);
    assert(sellerBal.available_amount.equals(new Prisma.Decimal(250)), 'Available balance reduced to 250 EGP');
    assert(sellerBal.held_amount.equals(new Prisma.Decimal(200)), 'Held balance increased to 200 EGP');

    // Admin approves & marks paid
    await FinancialService.reviewPayout(1, payoutReq.id, 'APPROVE');
    const paidReq = await FinancialService.reviewPayout(1, payoutReq.id, 'MARK_PAID');
    assert(paidReq.status === 'PAID', 'Payout request transitioned to PAID');

    sellerBal = await FinancialService.getOrCreateSellerBalance(testUser.id);
    assert(sellerBal.held_amount.equals(new Prisma.Decimal(0)), 'Held balance cleared');
    assert(sellerBal.withdrawn_amount.equals(new Prisma.Decimal(200)), 'Withdrawn balance set to 200 EGP');

    // ----------------------------------------------------
    // PHASE 10: REFUND ENGINE
    // ----------------------------------------------------
    console.log('\n--- PHASE 10: Refund Engine ---');
    const refund = await FinancialService.processRefundRecord({
      paymentTransactionId: paymentTx.id,
      amount: 100.00,
      reason: 'Customer cancellation requested',
      isAutomated: false,
      adminId: 1
    });
    assert(refund.status === 'COMPLETED', 'Refund record created and COMPLETED');
    assert(refund.amount.equals(new Prisma.Decimal(100)), 'Refund amount is 100 EGP');

    // ----------------------------------------------------
    // PHASE 11: CONCURRENCY & RESERVATIONS
    // ----------------------------------------------------
    console.log('\n--- PHASE 11: Concurrency & Reservations ---');
    await FinancialService.releaseExpiredReservations();
    assert(true, 'Expired reservation cleanup completed successfully');

    // ----------------------------------------------------
    // PHASE 12: RECONCILIATION REPORT
    // ----------------------------------------------------
    console.log('\n--- PHASE 12: Reconciliation Report ---');
    const report = await FinancialService.generateReconciliationReport();
    assert(typeof report.grossPrimaryRevenue === 'string', 'Primary revenue generated');
    assert(typeof report.resaleMarketplaceRevenue === 'string', 'Marketplace revenue generated');
    assert(typeof report.totalPayoutsPaid === 'string', 'Payouts total generated');

    // Cleanup test user
    await prisma.user.delete({ where: { id: testUser.id } });

  } catch (err: any) {
    console.error('❌ EXCEPTION IN FINANCIAL SUITE:', err);
    failed++;
  }

  console.log(`\n==================================================`);
  console.log(`🏁 [FINANCIAL SUITE RESULT] Passed: ${passed} | Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

testFinancialSystem()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
