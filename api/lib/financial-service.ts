import { Prisma, PrismaClient } from '@prisma/client';
import prisma from './prisma.js';
import crypto from 'crypto';
import { env } from './env.js';

// Dedicated Financial Encryption Key from env
const ENCRYPTION_SECRET = env.FINANCIAL_ENCRYPTION_KEY;

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

      await tx.notification.create({
        data: {
          user_id: userId,
          title: 'Payout Requested 💸',
          message: `Your withdrawal request #${payoutRequest.public_id} for EGP ${decAmt.toFixed(2)} has been submitted and is pending review.`,
          type: 'payout'
        }
      });

      return payoutRequest;
    });
  }

  static async reviewPayout(adminId: number, requestId: number, action: 'APPROVE' | 'REJECT' | 'MARK_PAID', failureReason?: string, providerRef?: string) {
    return await prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findUnique({
        where: { id: requestId },
        include: { user: true, destination: true }
      });

      if (!payout) throw new Error('Payout request not found');

      if (action === 'REJECT') {
        if (payout.status === 'FAILED') {
          return payout; // Idempotent: already rejected
        }
        if (payout.status === 'PAID') {
          throw new Error('Cannot reject an already paid payout');
        }

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

        await tx.notification.create({
          data: {
            user_id: payout.user_id,
            title: 'Payout Request Rejected ❌',
            message: `Your payout request #${payout.public_id} for EGP ${payout.amount.toFixed(2)} was rejected. Reason: ${failureReason || 'Admin rejection'}. Funds have been returned to your available wallet balance.`,
            type: 'payout'
          }
        });

        return updated;
      }

      if (action === 'APPROVE') {
        if (payout.status === 'APPROVED') {
          return payout; // Idempotent: already approved
        }
        if (payout.status === 'PAID' || payout.status === 'FAILED') {
          throw new Error(`Cannot approve a payout request that is already ${payout.status.toLowerCase()}`);
        }

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

        await tx.notification.create({
          data: {
            user_id: payout.user_id,
            title: 'Payout Request Approved ✅',
            message: `Your payout request #${payout.public_id} for EGP ${payout.amount.toFixed(2)} has been approved and is being processed for transfer.`,
            type: 'payout'
          }
        });

        return updated;
      }

      if (action === 'MARK_PAID') {
        if (payout.status === 'PAID') {
          return payout; // Idempotent: already paid
        }
        if (payout.status === 'FAILED') {
          throw new Error('Cannot mark a rejected payout request as paid');
        }

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
            paid_at: new Date(),
            provider_ref: providerRef || undefined
          }
        });

        const txRef = `PAYOUT-PAID-${payout.id}`;
        await this.recordDoubleEntryLedger({
          transactionRef: txRef,
          entries: [
            { accountType: 'PAYOUT_CLEARING', entryType: 'DEBIT', amount: payout.amount, userId: payout.user_id, description: 'Payout marked paid - Release clearing' },
            { accountType: 'CASH_CLEARING', entryType: 'CREDIT', amount: payout.amount, userId: payout.user_id, description: 'Payout marked paid - Cash transferred to seller' }
          ]
        }, tx);

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

        await tx.notification.create({
          data: {
            user_id: payout.user_id,
            title: 'Payout Dispatched 💰',
            message: `Your payout request #${payout.public_id} for EGP ${payout.amount.toFixed(2)} has been successfully transferred to your destination account.`,
            type: 'payout'
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

  /**
   * PHASE 13: ADVANCED ACCOUNTING DASHBOARD METRICS
   */
  static async generateAccountingDashboardMetrics(startDateStr?: string, endDateStr?: string) {
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const dateWhereOrder = startDate || endDate ? {
      created_at: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      }
    } : {};

    const dateWhereResale = startDate || endDate ? {
      sold_at: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      }
    } : {};

    const dateWherePayment = startDate || endDate ? {
      created_at: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      }
    } : {};

    const dateWherePayout = startDate || endDate ? {
      requested_at: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      }
    } : {};

    const dateWhereRefund = startDate || endDate ? {
      created_at: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {})
      }
    } : {};

    // 1. Primary Ticket Sales
    const primaryOrders = await prisma.order.aggregate({
      where: { is_paid: true, ...dateWhereOrder },
      _sum: { total_price: true },
      _count: true
    });

    // 2. Resale Ticket Sales
    const resaleSales = await prisma.ticketResaleListing.aggregate({
      where: { status: 'SOLD', ...dateWhereResale },
      _sum: { price: true, marketplace_fee: true, seller_payout: true },
      _count: true
    });

    // 3. Seller Balances (Current platform-wide liabilities)
    const sellerBalances = await prisma.sellerBalance.aggregate({
      _sum: { pending_amount: true, available_amount: true, held_amount: true, withdrawn_amount: true }
    });

    // 4. Payout Requests Summary
    const paidPayouts = await prisma.payoutRequest.aggregate({
      where: { status: 'PAID', ...dateWherePayout },
      _sum: { amount: true },
      _count: true
    });

    const outstandingPayouts = await prisma.payoutRequest.aggregate({
      where: { status: { in: ['REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'PROCESSING'] }, ...dateWherePayout },
      _sum: { amount: true },
      _count: true
    });

    // 5. Refunds Summary
    const completedRefunds = await prisma.refundRecord.aggregate({
      where: { status: 'COMPLETED', ...dateWhereRefund },
      _sum: { amount: true },
      _count: true
    });

    const pendingRefunds = await prisma.refundRecord.aggregate({
      where: { status: { in: ['REQUESTED', 'PROCESSING'] }, ...dateWhereRefund },
      _sum: { amount: true },
      _count: true
    });

    // 6. Payment Transaction Volume & Counts
    const successfulPayments = await prisma.paymentTransaction.aggregate({
      where: { status: { in: ['CAPTURED', 'SUCCESS'] }, ...dateWherePayment },
      _sum: { amount: true },
      _count: true
    });

    const failedPaymentsCount = await prisma.paymentTransaction.count({
      where: { status: 'FAILED', ...dateWherePayment }
    });

    const pendingPaymentsCount = await prisma.paymentTransaction.count({
      where: { status: 'PENDING', ...dateWherePayment }
    });

    // Derived Calculations
    const grossPrimaryVol = primaryOrders._sum?.total_price ? primaryOrders._sum.total_price.toNumber() : 0;
    const grossResaleVol = resaleSales._sum?.price ? resaleSales._sum.price.toNumber() : 0;
    const totalGrossRevenue = grossPrimaryVol + grossResaleVol;

    const primaryFeesTotal = 0; // Primary sales go to organizers
    const marketplaceFeesTotal = resaleSales._sum?.marketplace_fee ? resaleSales._sum.marketplace_fee.toNumber() : 0;
    const totalPlatformFees = primaryFeesTotal + marketplaceFeesTotal;

    const totalRefundsVal = completedRefunds._sum?.amount ? completedRefunds._sum.amount.toNumber() : 0;
    const netPlatformRevenue = Math.max(0, totalPlatformFees - totalRefundsVal);

    const pendingSettlement = sellerBalances._sum?.pending_amount ? sellerBalances._sum.pending_amount.toNumber() : 0;
    const availableSellerBalances = sellerBalances._sum?.available_amount ? sellerBalances._sum.available_amount.toNumber() : 0;
    const heldPayoutBalances = sellerBalances._sum?.held_amount ? sellerBalances._sum.held_amount.toNumber() : 0;
    const totalPaidOut = paidPayouts._sum?.amount ? paidPayouts._sum.amount.toNumber() : 0;
    const totalWithdrawn = sellerBalances._sum?.withdrawn_amount ? sellerBalances._sum.withdrawn_amount.toNumber() : 0;

    const marketplaceSellerLiability = pendingSettlement + availableSellerBalances + heldPayoutBalances;
    const organizerLiability = Math.max(0, grossPrimaryVol - primaryFeesTotal);

    // 7. Top Events by Primary Revenue
    const topEventsQuery = await prisma.order.groupBy({
      by: ['event_id'],
      where: { is_paid: true, ...dateWhereOrder },
      _sum: { total_price: true },
      _count: true,
      orderBy: { _sum: { total_price: 'desc' } },
      take: 5
    });

    const eventIds = topEventsQuery.map(e => e.event_id).filter((id): id is number => id !== null);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true, organizer: { select: { name: true } } }
    });
    const eventMap = new Map(events.map(e => [e.id, e]));

    const topEvents = topEventsQuery.map(item => ({
      eventId: item.event_id,
      title: item.event_id ? (eventMap.get(item.event_id)?.title || `Event #${item.event_id}`) : 'Direct Sale',
      organizerName: item.event_id ? (eventMap.get(item.event_id)?.organizer?.name || 'Organizer') : 'Platform',
      ordersCount: item._count,
      totalRevenue: item._sum?.total_price ? item._sum.total_price.toNumber() : 0
    }));

    // 8. Top Sellers by Resale Volume
    const topSellersQuery = await prisma.ticketResaleListing.groupBy({
      by: ['seller_id'],
      where: { status: 'SOLD', ...dateWhereResale },
      _sum: { price: true, seller_payout: true },
      _count: true,
      orderBy: { _sum: { price: 'desc' } },
      take: 5
    });

    const sellerIds = topSellersQuery.map(s => s.seller_id);
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true, email: true }
    });
    const sellerMap = new Map(sellers.map(s => [s.id, s]));

    const topSellers = topSellersQuery.map(item => ({
      sellerId: item.seller_id,
      sellerName: sellerMap.get(item.seller_id)?.name || `Seller #${item.seller_id}`,
      sellerEmail: sellerMap.get(item.seller_id)?.email || '',
      salesCount: item._count,
      totalVolume: item._sum?.price ? item._sum.price.toNumber() : 0,
      totalEarned: item._sum?.seller_payout ? item._sum.seller_payout.toNumber() : 0
    }));

    // 9. Top Refund Reasons
    const topRefundReasonsQuery = await prisma.refundRecord.groupBy({
      by: ['reason'],
      where: { status: 'COMPLETED', ...dateWhereRefund },
      _sum: { amount: true },
      _count: true,
      orderBy: { _count: { reason: 'desc' } },
      take: 5
    });

    const topRefundReasons = topRefundReasonsQuery.map(r => ({
      reason: r.reason,
      count: r._count,
      totalAmount: r._sum?.amount ? r._sum.amount.toNumber() : 0
    }));

    // 10. Daily Sales Trends over the last 30 days
    const days30Ago = new Date();
    days30Ago.setDate(days30Ago.getDate() - 30);

    const recentOrders = await prisma.order.findMany({
      where: { is_paid: true, created_at: { gte: days30Ago } },
      select: { total_price: true, created_at: true }
    });

    const recentResales = await prisma.ticketResaleListing.findMany({
      where: { status: 'SOLD', sold_at: { gte: days30Ago } },
      select: { price: true, marketplace_fee: true, sold_at: true }
    });

    const dailyTrendMap = new Map<string, { date: string; primaryVolume: number; resaleVolume: number; platformFees: number }>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dailyTrendMap.set(dateKey, { date: dateKey, primaryVolume: 0, resaleVolume: 0, platformFees: 0 });
    }

    for (const ord of recentOrders) {
      const dateKey = ord.created_at.toISOString().split('T')[0];
      if (dailyTrendMap.has(dateKey)) {
        const item = dailyTrendMap.get(dateKey)!;
        const tot = ord.total_price.toNumber();
        item.primaryVolume += tot;
      }
    }

    for (const res of recentResales) {
      if (res.sold_at) {
        const dateKey = res.sold_at.toISOString().split('T')[0];
        if (dailyTrendMap.has(dateKey)) {
          const item = dailyTrendMap.get(dateKey)!;
          item.resaleVolume += res.price.toNumber();
          item.platformFees += res.marketplace_fee.toNumber();
        }
      }
    }

    const trends = Array.from(dailyTrendMap.values());

    return {
      overview: {
        totalGrossRevenue,
        grossPrimaryVolume: grossPrimaryVol,
        grossResaleVolume: grossResaleVol,
        totalPlatformFees,
        primaryFeesTotal,
        marketplaceFeesTotal,
        netPlatformRevenue,
        organizerLiability,
        marketplaceSellerLiability,
        pendingSettlement,
        availableSellerBalances,
        heldPayoutBalances,
        totalPaidOut,
        totalWithdrawn,
        outstandingPayoutRequests: outstandingPayouts._sum.amount ? outstandingPayouts._sum.amount.toNumber() : 0,
        outstandingPayoutRequestsCount: outstandingPayouts._count,
        totalRefunds: totalRefundsVal,
        completedRefundsCount: completedRefunds._count,
        pendingRefundsAmount: pendingRefunds._sum.amount ? pendingRefunds._sum.amount.toNumber() : 0,
        pendingRefundsCount: pendingRefunds._count,
        successfulPaymentsCount: successfulPayments._count,
        successfulPaymentsAmount: successfulPayments._sum.amount ? successfulPayments._sum.amount.toNumber() : 0,
        failedPaymentsCount,
        pendingPaymentsCount,
        primaryOrdersCount: primaryOrders._count,
        resaleSalesCount: resaleSales._count
      },
      topEvents,
      topSellers,
      topRefundReasons,
      trends,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * PHASE 14: AUTOMATED LEDGER RECONCILIATION & INTEGRITY ENGINE
   */
  static async performFullReconciliation() {
    // 1. Fetch total entries & aggregate debits and credits
    const totalLedgerEntriesCount = await prisma.ledgerEntry.count();

    const debitAgg = await prisma.ledgerEntry.aggregate({
      where: { entry_type: 'DEBIT' },
      _sum: { amount: true }
    });

    const creditAgg = await prisma.ledgerEntry.aggregate({
      where: { entry_type: 'CREDIT' },
      _sum: { amount: true }
    });

    const grandTotalDebit = debitAgg._sum.amount ? debitAgg._sum.amount.toNumber() : 0;
    const grandTotalCredit = creditAgg._sum.amount ? creditAgg._sum.amount.toNumber() : 0;
    const globalLedgerBalanced = Math.abs(grandTotalDebit - grandTotalCredit) < 0.001;

    // 2. Transaction Ref Group Integrity Check (Group by transaction_ref and verify DEBIT == CREDIT)
    const transactionRefs = await prisma.ledgerEntry.groupBy({
      by: ['transaction_ref', 'entry_type'],
      _sum: { amount: true }
    });

    const refMap = new Map<string, { debit: number; credit: number }>();
    for (const row of transactionRefs) {
      const ref = row.transaction_ref;
      if (!refMap.has(ref)) refMap.set(ref, { debit: 0, credit: 0 });
      const current = refMap.get(ref)!;
      const amt = row._sum.amount ? row._sum.amount.toNumber() : 0;
      if (row.entry_type === 'DEBIT') {
        current.debit += amt;
      } else {
        current.credit += amt;
      }
    }

    const unbalancedTransactions: Array<{ transactionRef: string; debit: number; credit: number; difference: number }> = [];
    for (const [ref, values] of refMap.entries()) {
      const diff = Math.abs(values.debit - values.credit);
      if (diff > 0.01) {
        unbalancedTransactions.push({
          transactionRef: ref,
          debit: values.debit,
          credit: values.credit,
          difference: diff
        });
      }
    }

    // 3. Seller Balance Drift Verification (Compare SellerBalance model vs Ledger sums)
    const sellerBalances = await prisma.sellerBalance.findMany({
      include: { user: { select: { id: true, name: true, email: true } } }
    });

    const sellerBalanceDrift: Array<{
      userId: number;
      userName: string;
      userEmail: string;
      modelPending: number;
      modelAvailable: number;
      modelHeld: number;
      modelWithdrawn: number;
      ledgerPendingNet: number;
      ledgerAvailableNet: number;
      hasDrift: boolean;
    }> = [];

    for (const sb of sellerBalances) {
      // Calculate net pending from ledger entries
      const pendingEntries = await prisma.ledgerEntry.groupBy({
        by: ['entry_type'],
        where: { user_id: sb.user_id, account_type: 'SELLER_PENDING' },
        _sum: { amount: true }
      });
      let ledgerPendingCredit = 0;
      let ledgerPendingDebit = 0;
      for (const e of pendingEntries) {
        const amt = e._sum.amount ? e._sum.amount.toNumber() : 0;
        if (e.entry_type === 'CREDIT') ledgerPendingCredit += amt;
        if (e.entry_type === 'DEBIT') ledgerPendingDebit += amt;
      }
      const ledgerPendingNet = ledgerPendingCredit - ledgerPendingDebit;

      // Calculate net available from ledger entries
      const availableEntries = await prisma.ledgerEntry.groupBy({
        by: ['entry_type'],
        where: { user_id: sb.user_id, account_type: 'SELLER_AVAILABLE' },
        _sum: { amount: true }
      });
      let ledgerAvailableCredit = 0;
      let ledgerAvailableDebit = 0;
      for (const e of availableEntries) {
        const amt = e._sum.amount ? e._sum.amount.toNumber() : 0;
        if (e.entry_type === 'CREDIT') ledgerAvailableCredit += amt;
        if (e.entry_type === 'DEBIT') ledgerAvailableDebit += amt;
      }
      const ledgerAvailableNet = ledgerAvailableCredit - ledgerAvailableDebit;

      const modelPending = sb.pending_amount.toNumber();
      const modelAvailable = sb.available_amount.toNumber();
      const modelHeld = sb.held_amount.toNumber();
      const modelWithdrawn = sb.withdrawn_amount.toNumber();

      // Check drift
      const pendingDrift = Math.abs(modelPending - ledgerPendingNet) > 0.01;
      const availableDrift = Math.abs((modelAvailable + modelHeld) - ledgerAvailableNet) > 0.01;

      if (pendingDrift || availableDrift) {
        sellerBalanceDrift.push({
          userId: sb.user_id,
          userName: sb.user?.name || `User #${sb.user_id}`,
          userEmail: sb.user?.email || '',
          modelPending,
          modelAvailable,
          modelHeld,
          modelWithdrawn,
          ledgerPendingNet,
          ledgerAvailableNet,
          hasDrift: true
        });
      }
    }

    // 4. Missing Ledger Audit (Check for CAPTURED payments without LedgerEntry)
    const capturedPayments = await prisma.paymentTransaction.findMany({
      where: { status: { in: ['CAPTURED', 'SUCCESS'] } },
      select: { id: true, merchant_order_id: true, amount: true, created_at: true }
    });

    const unledgeredTransactions: Array<{ paymentTransactionId: number; merchantOrderId: string; amount: number; createdAt: string }> = [];

    for (const pt of capturedPayments) {
      const exists = await prisma.ledgerEntry.findFirst({
        where: { payment_transaction_id: pt.id }
      });
      if (!exists) {
        unledgeredTransactions.push({
          paymentTransactionId: pt.id,
          merchantOrderId: pt.merchant_order_id || 'N/A',
          amount: pt.amount.toNumber(),
          createdAt: pt.created_at.toISOString()
        });
      }
    }

    const isSystemReconciled = globalLedgerBalanced && unbalancedTransactions.length === 0 && sellerBalanceDrift.length === 0 && unledgeredTransactions.length === 0;

    return {
      isSystemReconciled,
      globalLedgerBalanced,
      totalLedgerEntriesCount,
      grandTotalDebit,
      grandTotalCredit,
      unbalancedTransactionsCount: unbalancedTransactions.length,
      unbalancedTransactions,
      sellerBalanceDriftCount: sellerBalanceDrift.length,
      sellerBalanceDrift,
      unledgeredTransactionsCount: unledgeredTransactions.length,
      unledgeredTransactions,
      reconciledAt: new Date().toISOString()
    };
  }

  /**
   * PHASE 15: PAGINATED LEDGER QUERY & FILTERING
   */
  static async getLedgerEntries(params: {
    page?: number;
    limit?: number;
    accountType?: string;
    entryType?: string;
    transactionRef?: string;
    userId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.LedgerEntryWhereInput = {};

    if (params.accountType && params.accountType !== 'ALL') {
      whereClause.account_type = params.accountType;
    }

    if (params.entryType && params.entryType !== 'ALL') {
      whereClause.entry_type = params.entryType;
    }

    if (params.transactionRef) {
      whereClause.transaction_ref = { contains: params.transactionRef };
    }

    if (params.userId) {
      whereClause.user_id = params.userId;
    }

    if (params.startDate || params.endDate) {
      whereClause.created_at = {
        ...(params.startDate ? { gte: new Date(params.startDate) } : {}),
        ...(params.endDate ? { lte: new Date(params.endDate) } : {})
      };
    }

    if (params.search) {
      const q = params.search.trim();
      whereClause.OR = [
        { transaction_ref: { contains: q } },
        { description: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } }
      ];
    }

    const [entries, totalCount] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          order: { select: { id: true, public_id: true, total_price: true } },
          resale_listing: { select: { id: true, price: true } },
          payment_transaction: { select: { id: true, provider_transaction_id: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.ledgerEntry.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      entries,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages
      }
    };
  }

  /**
   * PHASE 16: CSV LEDGER EXPORT
   */
  static async exportLedgerCsv(params: {
    accountType?: string;
    entryType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<string> {
    const result = await this.getLedgerEntries({ ...params, page: 1, limit: 5000 });
    
    const headers = ['Entry ID', 'Public ID', 'Transaction Ref', 'Date', 'Account Type', 'Entry Type', 'Amount (EGP)', 'User', 'Order ID', 'Description'];
    const rows = result.entries.map(e => [
      e.id,
      e.public_id,
      `"${e.transaction_ref}"`,
      e.created_at.toISOString(),
      e.account_type,
      e.entry_type,
      e.amount.toFixed(2),
      `"${e.user?.name || e.user?.email || (e.user_id ? `User #${e.user_id}` : 'Platform')}"`,
      e.order_id || 'N/A',
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

