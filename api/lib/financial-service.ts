import { Prisma, PrismaClient } from '@prisma/client';
import prisma from './prisma.js';
import crypto from 'crypto';

// Encryption key derived from JWT_SECRET or fallback for local dev
const ENCRYPTION_SECRET = process.env.JWT_SECRET || 'tickets-hub-financial-encryption-secret-key-32';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

/**
 * Production-Safe Financial Utilities
 */
export function toDecimal(value: number | string | Prisma.Decimal | null | undefined): Prisma.Decimal {
  if (value === null || value === undefined) return new Prisma.Decimal(0);
  if (value instanceof Prisma.Decimal) return value;
  return new Prisma.Decimal(value);
}

export function toNumber(value: number | string | Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return parseFloat(value.toString());
}

export function formatMoney(value: number | string | Prisma.Decimal): string {
  const dec = toDecimal(value);
  return dec.toFixed(2);
}

export function encryptDetail(plainText: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('[FINANCIAL ENCRYPTION ERROR]', err);
    return plainText; // Fallback to plain text if cipher fails
  }
}

export function decryptDetail(cipherText: string): string {
  try {
    if (!cipherText.includes(':')) return cipherText;
    const key = getEncryptionKey();
    const [ivHex, encryptedHex] = cipherText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[FINANCIAL DECRYPTION ERROR]', err);
    return cipherText;
  }
}

export function maskAccountDetail(type: string, detail: string): string {
  if (!detail || detail.length < 4) return '****';
  const last4 = detail.slice(-4);
  if (type === 'BANK_ACCOUNT' || type === 'IBAN') {
    return `EG${'*'.repeat(Math.max(4, detail.length - 6))}${last4}`;
  } else if (type === 'VODAFONE_CASH') {
    return `${detail.slice(0, 3)}****${last4}`;
  }
  return `****${last4}`;
}

export interface CalculateOrderPricingParams {
  baseAmount: number | Prisma.Decimal;
  serviceFeePercent?: number | Prisma.Decimal;
  processingFeePercent?: number | Prisma.Decimal;
  fixedFeeEgp?: number | Prisma.Decimal;
  discountPercent?: number;
}

export interface PricingBreakdown {
  baseAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  subtotalAfterDiscount: Prisma.Decimal;
  serviceFee: Prisma.Decimal;
  processingFee: Prisma.Decimal;
  fixedFee: Prisma.Decimal;
  totalPrice: Prisma.Decimal;
}

export function calculateOrderPricing(params: CalculateOrderPricingParams): PricingBreakdown {
  const baseAmount = toDecimal(params.baseAmount);
  const discountPercent = params.discountPercent ?? 0;
  
  const serviceFeePercent = toDecimal(params.serviceFeePercent ?? 10);
  const processingFeePercent = toDecimal(params.processingFeePercent ?? 2.75);
  const fixedFee = toDecimal(params.fixedFeeEgp ?? 3);

  // Discount calculation
  const discountAmount = baseAmount.mul(discountPercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  const subtotalAfterDiscount = baseAmount.sub(discountAmount).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  // Service Fee = Subtotal * serviceFeePercent / 100
  const serviceFee = subtotalAfterDiscount.mul(serviceFeePercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  // Processing Fee = Subtotal * processingFeePercent / 100
  const processingFee = subtotalAfterDiscount.mul(processingFeePercent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  // Total Price = Subtotal + Service Fee + Processing Fee + Fixed Fee
  const totalPrice = subtotalAfterDiscount.add(serviceFee).add(processingFee).add(fixedFee).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    baseAmount,
    discountAmount,
    subtotalAfterDiscount,
    serviceFee,
    processingFee,
    fixedFee,
    totalPrice
  };
}

export interface ResaleFeeBreakdown {
  originalPrice: Prisma.Decimal;
  listingPrice: Prisma.Decimal;
  marketplaceFee: Prisma.Decimal;
  sellerPayout: Prisma.Decimal;
}

export function calculateResalePricing(price: number | Prisma.Decimal, feePercent: number | Prisma.Decimal = 10): ResaleFeeBreakdown {
  const listingPrice = toDecimal(price);
  const feePct = toDecimal(feePercent);

  // Marketplace fee = Listing Price * feePct / 100
  const marketplaceFee = listingPrice.mul(feePct).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  
  // Seller payout = Listing Price - Marketplace Fee
  const sellerPayout = listingPrice.sub(marketplaceFee).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

  return {
    originalPrice: listingPrice,
    listingPrice,
    marketplaceFee,
    sellerPayout
  };
}

export class FinancialService {
  /**
   * PHASE 2: PAYMENT AUDIT LAYER
   */
  static async recordPaymentTransaction(data: {
    orderId?: number;
    resaleListingId?: number;
    provider?: string;
    providerTransactionId?: string;
    merchantOrderId?: string;
    amount: number | Prisma.Decimal;
    currency?: string;
    status: string;
    paymentMethod?: string;
    rawResponse?: any;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const rawResponseStr = data.rawResponse ? (typeof data.rawResponse === 'string' ? data.rawResponse : JSON.stringify(data.rawResponse)) : null;

    return await client.paymentTransaction.create({
      data: {
        order_id: data.orderId,
        resale_listing_id: data.resaleListingId,
        provider: data.provider || 'KASHIER',
        provider_transaction_id: data.providerTransactionId,
        merchant_order_id: data.merchantOrderId,
        amount: toDecimal(data.amount),
        currency: data.currency || 'EGP',
        status: data.status,
        payment_method: data.paymentMethod,
        raw_response: rawResponseStr,
      }
    });
  }

  /**
   * PHASE 3: WEBHOOK EVENT LOG & IDEMPOTENCY
   */
  static async processWebhookEventSafely(
    eventId: string,
    eventType: string,
    payload: any,
    processorFn: () => Promise<{ success: boolean; message?: string }>
  ) {
    // Check if event already exists
    const existing = await prisma.webhookEvent.findUnique({
      where: { event_id: eventId }
    });

    if (existing && existing.processing_status === 'PROCESSED') {
      console.log(`[FINANCIAL WEBHOOK] Duplicate webhook event skipped: ${eventId}`);
      return { status: 'DUPLICATE', processed: true };
    }

    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    let webhookRecord = existing;
    if (!webhookRecord) {
      webhookRecord = await prisma.webhookEvent.create({
        data: {
          event_id: eventId,
          provider: 'KASHIER',
          event_type: eventType,
          payload_hash: payloadHash,
          processing_status: 'PENDING',
          received_at: new Date()
        }
      });
    }

    try {
      const result = await processorFn();
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processing_status: result.success ? 'PROCESSED' : 'FAILED',
          processed_at: new Date(),
          failure_reason: result.message || null
        }
      });
      return { status: result.success ? 'PROCESSED' : 'FAILED', processed: true };
    } catch (err: any) {
      console.error(`[FINANCIAL WEBHOOK ERROR] Processing failed for ${eventId}:`, err);
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          processing_status: 'FAILED',
          failure_reason: err.message || 'Processing exception',
          retry_count: { increment: 1 }
        }
      });
      throw err;
    }
  }

  /**
   * PHASE 4: DOUBLE ENTRY LEDGER ENGINE
   */
  static async recordDoubleEntryLedger(data: {
    transactionRef: string;
    orderId?: number;
    resaleListingId?: number;
    paymentTransactionId?: number;
    entries: Array<{
      accountType: 'CASH_CLEARING' | 'SELLER_PENDING' | 'SELLER_AVAILABLE' | 'PLATFORM_REVENUE' | 'PAYOUT_CLEARING' | 'REFUND_CLEARING';
      entryType: 'DEBIT' | 'CREDIT';
      amount: number | Prisma.Decimal;
      description?: string;
      userId?: number;
    }>;
  }, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const entry of data.entries) {
      const amt = toDecimal(entry.amount);
      if (entry.entryType === 'DEBIT') {
        totalDebit = totalDebit.add(amt);
      } else {
        totalCredit = totalCredit.add(amt);
      }
    }

    // Verify accounting balance equation: DEBIT == CREDIT
    if (!totalDebit.equals(totalCredit)) {
      throw new Error(`[LEDGER ERROR] Unbalanced ledger entry! DEBIT: ${totalDebit.toFixed(2)} != CREDIT: ${totalCredit.toFixed(2)}`);
    }

    const createdEntries = [];
    for (const entry of data.entries) {
      const created = await client.ledgerEntry.create({
        data: {
          transaction_ref: data.transactionRef,
          order_id: data.orderId,
          resale_listing_id: data.resaleListingId,
          payment_transaction_id: data.paymentTransactionId,
          account_type: entry.accountType,
          entry_type: entry.entryType,
          amount: toDecimal(entry.amount),
          currency: 'EGP',
          description: entry.description,
          user_id: entry.userId,
        }
      });
      createdEntries.push(created);
    }

    return createdEntries;
  }

  /**
   * PHASE 5: SELLER BALANCES
   */
  static async getOrCreateSellerBalance(userId: number, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    let balance = await client.sellerBalance.findUnique({
      where: { user_id: userId }
    });

    if (!balance) {
      balance = await client.sellerBalance.create({
        data: {
          user_id: userId,
          pending_amount: new Prisma.Decimal(0),
          available_amount: new Prisma.Decimal(0),
          withdrawn_amount: new Prisma.Decimal(0),
          held_amount: new Prisma.Decimal(0),
        }
      });
    }

    return balance;
  }

  static async creditSellerPendingBalance(userId: number, amount: number | Prisma.Decimal, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const decAmt = toDecimal(amount);
    await this.getOrCreateSellerBalance(userId, client);

    return await client.sellerBalance.update({
      where: { user_id: userId },
      data: {
        pending_amount: { increment: decAmt }
      }
    });
  }

  static async releasePendingToAvailable(userId: number, amount: number | Prisma.Decimal, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const decAmt = toDecimal(amount);
    const balance = await this.getOrCreateSellerBalance(userId, client);

    if (balance.pending_amount.lt(decAmt)) {
      console.warn(`[SELLER BALANCE WARN] Pending balance (${balance.pending_amount.toFixed(2)}) less than release amount (${decAmt.toFixed(2)}). Adjusting release.`);
    }

    const releaseAmt = Prisma.Decimal.min(balance.pending_amount, decAmt);

    return await client.sellerBalance.update({
      where: { user_id: userId },
      data: {
        pending_amount: { decrement: releaseAmt },
        available_amount: { increment: releaseAmt }
      }
    });
  }

  /**
   * PHASE 6: SETTLEMENT ENGINE
   */
  static async processSettlementQueue() {
    const settings = await prisma.setting.findFirst();
    const holdHours = settings?.settlement_hold_hours ?? 24;
    const cutoffTime = new Date(Date.now() - holdHours * 3600 * 1000);

    // Find sold resale listings where event has ended or purchase time + holdHours has passed
    const listingsToSettle = await prisma.ticketResaleListing.findMany({
      where: {
        status: 'SOLD',
        sold_at: { lte: cutoffTime }
      },
      include: {
        ticket_instance: {
          include: {
            ticket_type: {
              include: { event: true }
            }
          }
        }
      }
    });

    let settledCount = 0;

    for (const listing of listingsToSettle) {
      const eventDate = listing.ticket_instance.ticket_type.event.date;
      const eventEndTime = new Date(eventDate.getTime() + 24 * 3600 * 1000);

      // Check if event end time + holdHours has passed
      if (Date.now() >= eventEndTime.getTime() + holdHours * 3600 * 1000) {
        await prisma.$transaction(async (tx) => {
          const sellerId = listing.seller_id;
          const payoutAmt = listing.seller_payout;

          await this.releasePendingToAvailable(sellerId, payoutAmt, tx);

          const txRef = `SETTLE-RESALE-${listing.id}`;
          await this.recordDoubleEntryLedger({
            transactionRef: txRef,
            resaleListingId: listing.id,
            entries: [
              { accountType: 'SELLER_PENDING', entryType: 'DEBIT', amount: payoutAmt, userId: sellerId, description: 'Settlement: Pending to Available' },
              { accountType: 'SELLER_AVAILABLE', entryType: 'CREDIT', amount: payoutAmt, userId: sellerId, description: 'Settlement: Available balance unlocked' }
            ]
          }, tx);

          // Update listing tag to indicate settled
          await tx.ticketResaleListing.update({
            where: { id: listing.id },
            data: { reason: 'SETTLED' }
          });
        });
        settledCount++;
      }
    }

    console.log(`[FINANCIAL SETTLEMENT] Settled ${settledCount} listings`);
    return { settledCount };
  }

  /**
   * PHASE 7: PAYOUT DESTINATIONS
   */
  static async addPayoutDestination(userId: number, data: {
    type: 'BANK_ACCOUNT' | 'INSTAPAY' | 'VODAFONE_CASH';
    accountName: string;
    accountDetails: string;
  }) {
    const masked = maskAccountDetail(data.type, data.accountDetails);
    const encrypted = encryptDetail(data.accountDetails);

    // Deactivate previous active destinations for user
    await prisma.payoutDestination.updateMany({
      where: { user_id: userId, is_active: true },
      data: { is_active: false }
    });

    return await prisma.payoutDestination.create({
      data: {
        user_id: userId,
        type: data.type,
        account_name: data.accountName,
        masked_details: masked,
        encrypted_details: encrypted,
        is_active: true,
        is_verified: true,
      }
    });
  }

  /**
   * PHASE 8: WITHDRAWAL SYSTEM
   */
  static async requestPayout(userId: number, destinationId: number, amount: number | Prisma.Decimal) {
    const decAmt = toDecimal(amount);
    const settings = await prisma.setting.findFirst();
    const minPayout = settings?.min_payout_amount_egp ?? new Prisma.Decimal(100);

    if (decAmt.lt(minPayout)) {
      throw new Error(`Minimum payout amount is EGP ${minPayout.toFixed(2)}`);
    }

    return await prisma.$transaction(async (tx) => {
      const balance = await this.getOrCreateSellerBalance(userId, tx);

      if (balance.available_amount.lt(decAmt)) {
        throw new Error(`Insufficient available balance (Available: EGP ${balance.available_amount.toFixed(2)})`);
      }

      // Deduct available, increment held
      await tx.sellerBalance.update({
        where: { user_id: userId },
        data: {
          available_amount: { decrement: decAmt },
          held_amount: { increment: decAmt }
        }
      });

      const destination = await tx.payoutDestination.findFirst({
        where: { id: destinationId, user_id: userId, is_active: true }
      });

      if (!destination) {
        throw new Error('Payout destination not found or inactive');
      }

      const payoutRequest = await tx.payoutRequest.create({
        data: {
          user_id: userId,
          destination_id: destinationId,
          amount: decAmt,
          currency: 'EGP',
          status: 'REQUESTED'
        }
      });

      const txRef = `PAYOUT-REQ-${payoutRequest.id}`;
      await this.recordDoubleEntryLedger({
        transactionRef: txRef,
        entries: [
          { accountType: 'SELLER_AVAILABLE', entryType: 'DEBIT', amount: decAmt, userId, description: 'Payout requested - Hold funds' },
          { accountType: 'PAYOUT_CLEARING', entryType: 'CREDIT', amount: decAmt, userId, description: 'Payout requested - Clearing account' }
        ]
      }, tx);

      return payoutRequest;
    });
  }

  static async reviewPayout(adminId: number, requestId: number, action: 'APPROVE' | 'REJECT' | 'MARK_PAID', failureReason?: string) {
    return await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({
        where: { id: requestId },
        include: { user: true, destination: true }
      });

      if (!payout) throw new Error('Payout request not found');

      if (action === 'REJECT') {
        if (payout.status === 'PAID') throw new Error('Cannot reject an already paid payout');

        // Refund held amount back to available balance
        await tx.sellerBalance.update({
          where: { user_id: payout.user_id },
          data: {
            held_amount: { decrement: payout.amount },
            available_amount: { increment: payout.amount }
          }
        });

        const updated = await tx.payoutRequest.update({
          where: { id: requestId },
          data: {
            status: 'FAILED',
            failure_reason: failureReason || 'Rejected by admin'
          }
        });

        const txRef = `PAYOUT-REJECT-${payout.id}`;
        await this.recordDoubleEntryLedger({
          transactionRef: txRef,
          entries: [
            { accountType: 'PAYOUT_CLEARING', entryType: 'DEBIT', amount: payout.amount, userId: payout.user_id, description: 'Payout rejected - Release clearing' },
            { accountType: 'SELLER_AVAILABLE', entryType: 'CREDIT', amount: payout.amount, userId: payout.user_id, description: 'Payout rejected - Refund to available' }
          ]
        }, tx);

        await tx.financialAuditLog.create({
          data: {
            actor_id: adminId,
            actor_role: 'ADMIN',
            action: 'PAYOUT_REJECTED',
            entity_type: 'PAYOUT_REQUEST',
            entity_id: payout.public_id,
            amount: payout.amount,
            reason: failureReason || 'Admin rejection'
          }
        });

        return updated;
      }

      if (action === 'APPROVE') {
        const updated = await tx.payoutRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            approved_by_admin_id: adminId,
            approved_at: new Date()
          }
        });

        await tx.financialAuditLog.create({
          data: {
            actor_id: adminId,
            actor_role: 'ADMIN',
            action: 'PAYOUT_APPROVED',
            entity_type: 'PAYOUT_REQUEST',
            entity_id: payout.public_id,
            amount: payout.amount
          }
        });

        return updated;
      }

      if (action === 'MARK_PAID') {
        // Move held to withdrawn
        await tx.sellerBalance.update({
          where: { user_id: payout.user_id },
          data: {
            held_amount: { decrement: payout.amount },
            withdrawn_amount: { increment: payout.amount }
          }
        });

        const updated = await tx.payoutRequest.update({
          where: { id: requestId },
          data: {
            status: 'PAID',
            paid_at: new Date()
          }
        });

        await tx.financialAuditLog.create({
          data: {
            actor_id: adminId,
            actor_role: 'ADMIN',
            action: 'PAYOUT_PAID',
            entity_type: 'PAYOUT_REQUEST',
            entity_id: payout.public_id,
            amount: payout.amount
          }
        });

        return updated;
      }

      throw new Error('Invalid review action');
    });
  }

  /**
   * PHASE 10: REFUND ENGINE
   */
  static async processRefundRecord(data: {
    orderId?: number;
    paymentTransactionId: number;
    amount: number | Prisma.Decimal;
    reason: string;
    isAutomated?: boolean;
    adminId?: number;
  }) {
    return await prisma.$transaction(async (tx) => {
      const decAmt = toDecimal(data.amount);

      const refund = await tx.refundRecord.create({
        data: {
          payment_transaction_id: data.paymentTransactionId,
          order_id: data.orderId,
          amount: decAmt,
          currency: 'EGP',
          reason: data.reason,
          status: 'COMPLETED',
          is_automated: data.isAutomated ?? false,
          created_by_admin_id: data.adminId ?? null
        }
      });

      // Record double entry ledger for refund
      const txRef = `REFUND-${refund.id}`;
      await this.recordDoubleEntryLedger({
        transactionRef: txRef,
        orderId: data.orderId,
        paymentTransactionId: data.paymentTransactionId,
        entries: [
          { accountType: 'PLATFORM_REVENUE', entryType: 'DEBIT', amount: decAmt, description: `Refund: ${data.reason}` },
          { accountType: 'CASH_CLEARING', entryType: 'CREDIT', amount: decAmt, description: `Refund credited to buyer` }
        ]
      }, tx);

      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId },
          data: {
            order_status: 'refunded',
            is_paid: false
          }
        });
      }

      await tx.financialAuditLog.create({
        data: {
          actor_id: data.adminId ?? null,
          actor_role: data.isAutomated ? 'SYSTEM' : 'ADMIN',
          action: 'REFUND_ISSUED',
          entity_type: 'REFUND',
          entity_id: refund.public_id,
          amount: decAmt,
          reason: data.reason
        }
      });

      return refund;
    });
  }

  /**
   * PHASE 11: CONCURRENCY & RESERVATIONS
   */
  static async reserveResaleListing(listingId: number, buyerId: number, reservationMinutes: number = 10) {
    return await prisma.$transaction(async (tx) => {
      const listing = await tx.ticketResaleListing.findUnique({
        where: { id: listingId }
      });

      if (!listing) throw new Error('Resale listing not found');

      const now = new Date();
      // Check if reserved by someone else and reservation is still valid
      if (listing.status === 'RESERVED' || listing.status === 'PAYMENT_PENDING') {
        if (listing.reservation_expires_at && listing.reservation_expires_at > now) {
          if (listing.reserved_by_user_id !== buyerId) {
            throw new Error('Listing is currently reserved by another buyer');
          }
        }
      }

      if (listing.status === 'SOLD' || listing.status === 'CANCELLED') {
        throw new Error(`Listing is no longer available (Status: ${listing.status})`);
      }

      const expiresAt = new Date(now.getTime() + reservationMinutes * 60 * 1000);

      return await tx.ticketResaleListing.update({
        where: { id: listingId },
        data: {
          status: 'RESERVED',
          reserved_by_user_id: buyerId,
          reservation_expires_at: expiresAt
        }
      });
    });
  }

  static async releaseExpiredReservations() {
    const now = new Date();
    const expired = await prisma.ticketResaleListing.updateMany({
      where: {
        status: 'RESERVED',
        reservation_expires_at: { lt: now }
      },
      data: {
        status: 'LISTED',
        reserved_by_user_id: null,
        reservation_expires_at: null
      }
    });

    if (expired.count > 0) {
      console.log(`[CONCURRENCY] Released ${expired.count} expired resale reservations`);
    }
    return expired;
  }

  /**
   * PHASE 12: FINANCIAL RECONCILIATION REPORT
   */
  static async generateReconciliationReport() {
    const totalOrders = await prisma.order.aggregate({
      where: { is_paid: true },
      _sum: { total_price: true },
      _count: true
    });

    const totalResaleSales = await prisma.ticketResaleListing.aggregate({
      where: { status: 'SOLD' },
      _sum: { price: true, marketplace_fee: true, seller_payout: true },
      _count: true
    });

    const totalSellerPending = await prisma.sellerBalance.aggregate({
      _sum: { pending_amount: true, available_amount: true, withdrawn_amount: true, held_amount: true }
    });

    const totalPayoutsPaid = await prisma.payoutRequest.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
      _count: true
    });

    const totalRefunds = await prisma.refundRecord.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true
    });

    return {
      grossPrimaryRevenue: totalOrders._sum.total_price ? totalOrders._sum.total_price.toFixed(2) : '0.00',
      primaryOrdersCount: totalOrders._count,
      grossResaleVolume: totalResaleSales._sum.price ? totalResaleSales._sum.price.toFixed(2) : '0.00',
      resaleMarketplaceRevenue: totalResaleSales._sum.marketplace_fee ? totalResaleSales._sum.marketplace_fee.toFixed(2) : '0.00',
      sellerPayoutsEarned: totalResaleSales._sum.seller_payout ? totalResaleSales._sum.seller_payout.toFixed(2) : '0.00',
      sellerPendingBalance: totalSellerPending._sum.pending_amount ? totalSellerPending._sum.pending_amount.toFixed(2) : '0.00',
      sellerAvailableBalance: totalSellerPending._sum.available_amount ? totalSellerPending._sum.available_amount.toFixed(2) : '0.00',
      sellerWithdrawnBalance: totalSellerPending._sum.withdrawn_amount ? totalSellerPending._sum.withdrawn_amount.toFixed(2) : '0.00',
      totalPayoutsPaid: totalPayoutsPaid._sum.amount ? totalPayoutsPaid._sum.amount.toFixed(2) : '0.00',
      totalRefundsAmount: totalRefunds._sum.amount ? totalRefunds._sum.amount.toFixed(2) : '0.00',
      reconciledAt: new Date().toISOString()
    };
  }
}
