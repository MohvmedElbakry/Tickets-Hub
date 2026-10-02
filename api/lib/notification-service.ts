import prisma from './prisma.js';
import { sendEmail } from './mailer.js';
import * as templates from './email-templates.js';

export enum NotificationEventType {
  AUTH_WELCOME = 'AUTH_WELCOME',
  AUTH_EMAIL_VERIFICATION = 'AUTH_EMAIL_VERIFICATION',
  AUTH_PASSWORD_RESET = 'AUTH_PASSWORD_RESET',
  AUTH_PASSWORD_CHANGED = 'AUTH_PASSWORD_CHANGED',
  AUTH_ACCOUNT_DELETED = 'AUTH_ACCOUNT_DELETED',

  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  BOOKING_APPROVED = 'BOOKING_APPROVED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',

  TICKET_ISSUED = 'TICKET_ISSUED',
  TICKET_TRANSFER_INITIATED = 'TICKET_TRANSFER_INITIATED',
  TICKET_TRANSFER_ACCEPTED = 'TICKET_TRANSFER_ACCEPTED',
  TICKET_TRANSFER_DECLINED = 'TICKET_TRANSFER_DECLINED',
  TICKET_TRANSFER_CANCELLED = 'TICKET_TRANSFER_CANCELLED',

  MARKETPLACE_LISTING_CREATED = 'MARKETPLACE_LISTING_CREATED',
  MARKETPLACE_LISTING_APPROVED = 'MARKETPLACE_LISTING_APPROVED',
  MARKETPLACE_LISTING_REMOVED = 'MARKETPLACE_LISTING_REMOVED',
  MARKETPLACE_TICKET_SOLD = 'MARKETPLACE_TICKET_SOLD',
  MARKETPLACE_BUYER_PURCHASED = 'MARKETPLACE_BUYER_PURCHASED',

  SELLER_CREDITED = 'SELLER_CREDITED',
  SETTLEMENT_COMPLETED = 'SETTLEMENT_COMPLETED',

  PAYOUT_SUBMITTED = 'PAYOUT_SUBMITTED',
  PAYOUT_APPROVED = 'PAYOUT_APPROVED',
  PAYOUT_REJECTED = 'PAYOUT_REJECTED',
  PAYOUT_PAID = 'PAYOUT_PAID',

  EVENT_UPDATED = 'EVENT_UPDATED',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  EVENT_REMINDER = 'EVENT_REMINDER',
  EVENT_INVITATION = 'EVENT_INVITATION',
  WAITLIST_JOINED = 'WAITLIST_JOINED',
  WAITLIST_LEFT = 'WAITLIST_LEFT',

  ADMIN_ANNOUNCEMENT = 'ADMIN_ANNOUNCEMENT',
  ADMIN_WAITLIST_ALERT = 'ADMIN_WAITLIST_ALERT',
  TEST_EMAIL = 'TEST_EMAIL'
}

export type NotificationChannel = 'EMAIL' | 'DATABASE' | 'BOTH';

export interface DispatchParams {
  eventType: NotificationEventType | string;
  recipientEmail: string;
  recipientId?: number;
  recipientName?: string;
  channels?: NotificationChannel;
  idempotencyKey?: string;
  relatedEntityType?: 'order' | 'ticket' | 'listing' | 'payout' | 'event' | 'user' | 'refund';
  relatedEntityId?: string | number;
  
  // Custom payload attributes depending on eventType
  data?: Record<string, any>;
  
  // Directly passed title/message for in-app / custom announcement
  dbTitle?: string;
  dbMessage?: string;
  dbLink?: string;
  dbType?: 'info' | 'success' | 'warning' | 'error';

  // Email subject / html overrides if needed
  customSubject?: string;
  customHtml?: string;
  customText?: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
}

export class NotificationService {
  private static isWorkerRunning = false;

  /**
   * Helper to ensure user preferences exist
   */
  public static async getUserPreferences(userId: number) {
    try {
      let pref = await prisma.notificationPreference.findUnique({
        where: { user_id: userId }
      });
      if (!pref) {
        pref = await prisma.notificationPreference.create({
          data: { user_id: userId }
        });
      }
      return pref;
    } catch (err) {
      console.error(`[NotificationService] Error getting preferences for user ${userId}:`, err);
      // Fallback defaults
      return {
        email_notifications: true,
        db_notifications: true,
        marketplace_alerts: true,
        wallet_alerts: true,
        payout_alerts: true,
        event_reminders: true,
        marketing: false,
        admin_announcements: true
      };
    }
  }

  /**
   * Update user preferences
   */
  public static async updateUserPreferences(userId: number, updates: Record<string, boolean>) {
    return await prisma.notificationPreference.upsert({
      where: { user_id: userId },
      update: updates,
      create: { user_id: userId, ...updates }
    });
  }

  /**
   * Check if category preference allows notification
   */
  private static shouldSendForCategory(pref: any, eventType: string): boolean {
    if (!pref) return true;
    if (eventType.startsWith('MARKETPLACE_') && !pref.marketplace_alerts) return false;
    if ((eventType.startsWith('SELLER_') || eventType.startsWith('SETTLEMENT_')) && !pref.wallet_alerts) return false;
    if (eventType.startsWith('PAYOUT_') && !pref.payout_alerts) return false;
    if ((eventType.startsWith('EVENT_') || eventType.startsWith('WAITLIST_')) && !pref.event_reminders) return false;
    if (eventType === NotificationEventType.ADMIN_ANNOUNCEMENT && !pref.admin_announcements) return false;
    return true;
  }

  /**
   * Single Entry Point for All System Notifications
   */
  public static async dispatch(params: DispatchParams): Promise<{ success: boolean; logId?: number; duplicate?: boolean }> {
    const {
      eventType,
      recipientEmail,
      recipientId,
      recipientName = '',
      channels = 'BOTH',
      idempotencyKey,
      relatedEntityType,
      relatedEntityId,
      data = {},
      attachments = []
    } = params;

    const key = idempotencyKey || `${eventType}:${recipientEmail}:${relatedEntityType || ''}:${relatedEntityId || ''}`;

    // PHASE 4 — DUPLICATE NOTIFICATION PREVENTION
    const existingLog = await prisma.notificationLog.findUnique({
      where: { idempotency_key: key }
    });

    if (existingLog) {
      if (existingLog.status === 'DELIVERED' || existingLog.status === 'QUEUED' || existingLog.status === 'PROCESSING') {
        console.log(`[NotificationService] Duplicate suppressed for idempotency key: ${key}`);
        return { success: true, logId: existingLog.id, duplicate: true };
      }
    }

    // Load recipient user id if missing
    let targetUserId = recipientId;
    if (!targetUserId && recipientEmail) {
      const user = await prisma.user.findUnique({ where: { email: recipientEmail }, select: { id: true, name: true } });
      if (user) {
        targetUserId = user.id;
      }
    }

    // Preferences check
    let preferences = null;
    if (targetUserId) {
      preferences = await this.getUserPreferences(targetUserId);
    }

    if (preferences && !this.shouldSendForCategory(preferences, eventType)) {
      console.log(`[NotificationService] Notification skipped due to user preference settings for user ${targetUserId}, event: ${eventType}`);
      return { success: true };
    }

    // Render Title / Message / Email Content
    const rendered = this.renderContent(params);

    // 1. In-App Database Notification
    if ((channels === 'DATABASE' || channels === 'BOTH') && targetUserId) {
      if (!preferences || preferences.db_notifications) {
        try {
          // Deduplicate in-app notification creation
          const recentDbNotif = await prisma.notification.findFirst({
            where: {
              user_id: targetUserId,
              title: rendered.dbTitle,
              message: rendered.dbMessage,
              created_at: { gte: new Date(Date.now() - 30000) } // Within 30 seconds
            }
          });

          if (!recentDbNotif) {
            await prisma.notification.create({
              data: {
                user_id: targetUserId,
                title: rendered.dbTitle,
                message: rendered.dbMessage,
                type: params.dbType || 'info',
                link: rendered.dbLink || null
              }
            });
            console.log(`[NotificationService] DB Notification created for user ${targetUserId}: "${rendered.dbTitle}"`);
          }
        } catch (dbErr) {
          console.error(`[NotificationService] Error creating DB notification:`, dbErr);
        }
      }
    }

    // 2. Email Queue & Async Delivery Pipeline
    if ((channels === 'EMAIL' || channels === 'BOTH') && recipientEmail) {
      if (!preferences || preferences.email_notifications) {
        try {
          const sanitizedPayload = JSON.stringify({
            data,
            subject: rendered.emailSubject,
            customHtml: rendered.emailHtml,
            customText: rendered.emailText,
            dbTitle: rendered.dbTitle,
            attachments
          });

          const log = await prisma.notificationLog.upsert({
            where: { idempotency_key: key },
            update: {
              status: 'QUEUED',
              recipient_email: recipientEmail,
              recipient_id: targetUserId || null,
              subject: rendered.emailSubject,
              template_name: eventType,
              payload_json: sanitizedPayload,
              attempts: 0,
              last_error: null
            },
            create: {
              event_type: eventType,
              recipient_email: recipientEmail,
              recipient_id: targetUserId || null,
              idempotency_key: key,
              channel: 'EMAIL',
              status: 'QUEUED',
              subject: rendered.emailSubject,
              template_name: eventType,
              payload_json: sanitizedPayload,
              related_entity_type: relatedEntityType || null,
              related_entity_id: relatedEntityId ? String(relatedEntityId) : null
            }
          });

          // Trigger asynchronous non-blocking background queue processor
          setImmediate(() => {
            this.processNotificationQueue().catch(err =>
              console.error('[NotificationService] Background queue processing error:', err)
            );
          });

          return { success: true, logId: log.id };
        } catch (logErr) {
          console.error(`[NotificationService] Failed to create email queue log:`, logErr);
          return { success: false };
        }
      }
    }

    return { success: true };
  }

  /**
   * Render Subject, Body, and DB Messages based on Event Type
   */
  private static renderContent(params: DispatchParams) {
    const { eventType, recipientEmail, recipientName = '', data = {}, customSubject, customHtml, customText, dbTitle, dbMessage, dbLink } = params;

    let emailSubject = customSubject || 'Notification from TicketsHub';
    let emailHtml = customHtml || '';
    let emailText = customText || '';
    let title = dbTitle || 'TicketsHub Alert';
    let message = dbMessage || 'You have a new notification.';
    let link = dbLink || '/dashboard';

    switch (eventType) {
      case NotificationEventType.AUTH_WELCOME: {
        const t = templates.renderWelcomeTemplate(recipientName, recipientEmail, data.loginUrl || `${process.env.APP_URL || ''}/login`);
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = 'Welcome to TicketsHub! 🎉';
        message = 'Your account has been created. Explore events or complete your profile.';
        link = '/dashboard';
        break;
      }

      case NotificationEventType.AUTH_EMAIL_VERIFICATION: {
        const t = templates.renderVerificationTemplate(recipientName, recipientEmail, data.verificationUrl);
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = 'Verify Your Email Address ✉️';
        message = 'Please check your inbox to verify your email address.';
        link = '/profile';
        break;
      }

      case NotificationEventType.AUTH_PASSWORD_RESET: {
        const t = templates.renderPasswordResetTemplate(recipientName, recipientEmail, data.resetUrl);
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = 'Password Reset Requested 🔑';
        message = 'A password reset link was sent to your registered email.';
        link = '/forgot-password';
        break;
      }

      case NotificationEventType.AUTH_PASSWORD_CHANGED: {
        const t = templates.renderPasswordChangedTemplate(recipientName, recipientEmail);
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = 'Password Updated 🔒';
        message = 'Your account password was recently changed.';
        link = '/profile';
        break;
      }

      case NotificationEventType.ORDER_CREATED:
      case NotificationEventType.PAYMENT_SUCCESSFUL: {
        const t = templates.renderOrderConfirmationTemplate(
          recipientName,
          recipientEmail,
          data.eventTitle || 'Event',
          data.orderNumber || 'ORDER',
          data.totalPrice || 0,
          data.ticketCount || 1,
          data.ticketsUrl || `${process.env.APP_URL || ''}/dashboard`
        );
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = `Order Confirmed: ${data.eventTitle || 'Event'} 🎟️`;
        message = `Your order #${data.orderNumber} for ${data.eventTitle} is confirmed!`;
        link = '/dashboard';
        break;
      }

      case NotificationEventType.MARKETPLACE_LISTING_CREATED: {
        const t = templates.renderResaleListingTemplate(
          recipientName,
          recipientEmail,
          data.eventTitle || 'Event',
          data.ticketTypeName || 'Ticket',
          data.listingPrice || 0,
          data.publicId || 'REF',
          `${process.env.APP_URL || ''}/dashboard`
        );
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = 'Ticket Listed for Resale 🎟️';
        message = `Your ticket for ${data.eventTitle} is now listed on the marketplace.`;
        link = '/dashboard';
        break;
      }

      case NotificationEventType.MARKETPLACE_TICKET_SOLD: {
        const t = templates.renderResaleSoldTemplate(
          recipientName,
          recipientEmail,
          data.eventTitle || 'Event',
          data.price || 0,
          data.payoutAmount || 0,
          data.publicId || 'REF',
          `${process.env.APP_URL || ''}/dashboard`
        );
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = 'Ticket Sold! 💰';
        message = `Your resale ticket for ${data.eventTitle} was purchased! ${data.payoutAmount} EGP credited to your wallet.`;
        link = '/dashboard';
        break;
      }

      case NotificationEventType.PAYOUT_SUBMITTED:
      case NotificationEventType.PAYOUT_APPROVED:
      case NotificationEventType.PAYOUT_PAID:
      case NotificationEventType.PAYOUT_REJECTED: {
        const statusStr = eventType === NotificationEventType.PAYOUT_SUBMITTED ? 'SUBMITTED' :
                         eventType === NotificationEventType.PAYOUT_APPROVED ? 'APPROVED' :
                         eventType === NotificationEventType.PAYOUT_PAID ? 'PAID' : 'REJECTED';
        const t = templates.renderPayoutStatusTemplate(
          recipientName,
          recipientEmail,
          data.payoutRef || 'PR-REF',
          data.amount || 0,
          statusStr as any,
          data.reason,
          `${process.env.APP_URL || ''}/dashboard`
        );
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = `Payout ${statusStr} 💸`;
        message = `Your payout request ${data.payoutRef} (${data.amount} EGP) is now ${statusStr}.`;
        link = '/dashboard';
        break;
      }

      case NotificationEventType.ADMIN_ANNOUNCEMENT: {
        const t = templates.renderGenericAnnouncementTemplate(
          recipientName,
          recipientEmail,
          data.subject || 'Platform Announcement',
          data.messageHtml || message,
          data.ctaText,
          data.ctaUrl
        );
        emailSubject = t.subject;
        emailHtml = t.html;
        emailText = t.text;
        title = data.subject || 'TicketsHub Announcement';
        message = data.dbMessage || 'New announcement from TicketsHub.';
        link = data.ctaUrl || '/dashboard';
        break;
      }

      default: {
        if (!emailHtml) {
          const t = templates.renderGenericAnnouncementTemplate(
            recipientName,
            recipientEmail,
            emailSubject,
            `<p>${message}</p>`
          );
          emailHtml = t.html;
          emailText = t.text;
        }
      }
    }

    if (customSubject) emailSubject = customSubject;
    if (customHtml) emailHtml = customHtml;
    if (customText) emailText = customText;

    return {
      emailSubject,
      emailHtml,
      emailText,
      dbTitle: title,
      dbMessage: message,
      dbLink: link
    };
  }

  /**
   * Background Queue Processor with Exponential Backoff
   */
  public static async processNotificationQueue(): Promise<number> {
    if (this.isWorkerRunning) return 0;
    this.isWorkerRunning = true;

    let processedCount = 0;

    try {
      const queuedLogs = await prisma.notificationLog.findMany({
        where: {
          status: 'QUEUED',
          attempts: { lt: 3 }
        },
        take: 10,
        orderBy: { created_at: 'asc' }
      });

      for (const log of queuedLogs) {
        // Mark as PROCESSING
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'PROCESSING', last_attempt_at: new Date() }
        });

        try {
          const payload = log.payload_json ? JSON.parse(log.payload_json) : {};
          const recipientName = log.recipient_id ? (await prisma.user.findUnique({ where: { id: log.recipient_id }, select: { name: true } }))?.name || '' : '';

          const content = this.renderContent({
            eventType: log.event_type as any,
            recipientEmail: log.recipient_email,
            recipientName,
            data: payload.data || {},
            customSubject: log.subject || undefined,
            customHtml: payload.customHtml || undefined,
            customText: payload.customText || undefined
          });

          const result = await sendEmail({
            to: log.recipient_email,
            subject: content.emailSubject,
            html: content.emailHtml,
            text: content.emailText,
            attachments: payload.attachments || []
          });

          if (result.success) {
            await prisma.notificationLog.update({
              where: { id: log.id },
              data: {
                status: 'DELIVERED',
                sent_at: new Date(),
                attempts: log.attempts + 1,
                last_error: null
              }
            });
            processedCount++;
            console.log(`[NotificationQueue] Log #${log.id} successfully sent to ${log.recipient_email}`);
          } else {
            throw new Error('Email transport returned success: false');
          }
        } catch (err: any) {
          const nextAttempts = log.attempts + 1;
          const status = nextAttempts >= log.max_attempts ? 'FAILED' : 'QUEUED';
          console.error(`[NotificationQueue] Log #${log.id} attempt ${nextAttempts} failed:`, err.message);

          await prisma.notificationLog.update({
            where: { id: log.id },
            data: {
              status,
              attempts: nextAttempts,
              last_error: err.message || String(err)
            }
          });
        }
      }
    } catch (queueErr) {
      console.error('[NotificationQueue] Error during queue processing cycle:', queueErr);
    } finally {
      this.isWorkerRunning = false;
    }

    return processedCount;
  }

  /**
   * Admin Dashboard Query Methods
   */
  public static async getNotificationLogs(params: {
    page?: number;
    limit?: number;
    status?: string;
    eventType?: string;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.eventType) where.event_type = params.eventType;
    if (params.search) {
      where.OR = [
        { recipient_email: { contains: params.search, mode: 'insensitive' } },
        { subject: { contains: params.search, mode: 'insensitive' } },
        { idempotency_key: { contains: params.search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }
      }),
      prisma.notificationLog.count({ where })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  public static async getNotificationStats() {
    const [queued, processing, delivered, failed] = await Promise.all([
      prisma.notificationLog.count({ where: { status: 'QUEUED' } }),
      prisma.notificationLog.count({ where: { status: 'PROCESSING' } }),
      prisma.notificationLog.count({ where: { status: 'DELIVERED' } }),
      prisma.notificationLog.count({ where: { status: 'FAILED' } })
    ]);

    return {
      queued,
      processing,
      delivered,
      failed,
      total: queued + processing + delivered + failed
    };
  }

  public static async retryFailedLog(logId: number) {
    const log = await prisma.notificationLog.findUnique({ where: { id: logId } });
    if (!log) throw new Error('Notification log record not found');

    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: 'QUEUED',
        attempts: 0,
        last_error: null
      }
    });

    setImmediate(() => {
      this.processNotificationQueue().catch(err => console.error('[NotificationService] Retry processing error:', err));
    });

    return { message: 'Notification queued for immediate re-attempt.' };
  }
}
