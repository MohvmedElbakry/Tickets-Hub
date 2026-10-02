import { getPersonalizedName } from './mailer.js';

export interface BaseTemplateOptions {
  recipientName?: string;
  recipientEmail?: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNotice?: string;
}

export function generateBaseEmailHtml(options: BaseTemplateOptions): string {
  const name = getPersonalizedName(options.recipientName, options.recipientEmail);
  const brandColor = '#10B981';
  const headerBg = '#0A0F0E';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${options.preheader || options.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding: 30px 0; }
          .content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; }
          .header { background-color: ${headerBg}; padding: 28px 32px; text-align: center; border-bottom: 2px solid #10B981; }
          .header h1 { color: ${brandColor}; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: 0.05em; display: inline-block; }
          .body { padding: 32px; line-height: 1.6; font-size: 15px; }
          .body h2 { color: #0F172A; font-size: 20px; margin-top: 0; font-weight: 700; margin-bottom: 16px; }
          .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .btn { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-weight: 700; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 15px; }
          .footer { text-align: center; padding: 24px 32px; font-size: 12px; color: #94a3b8; background-color: #fafafa; border-top: 1px solid #f1f5f9; }
          ul { padding-left: 20px; margin: 16px 0; }
          li { margin-bottom: 8px; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .meta-label { font-weight: 600; color: #64748b; }
          .meta-value { font-weight: 700; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="content">
            <div class="header">
              <h1>🎟️ TicketsHub</h1>
            </div>
            <div class="body">
              <h2>${options.title}</h2>
              <p>Hi ${name},</p>
              ${options.bodyHtml}
              ${options.ctaUrl && options.ctaText ? `
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${options.ctaUrl}" class="btn" target="_blank">${options.ctaText}</a>
                </div>
              ` : ''}
              <p style="margin-top: 24px; font-size: 14px; color: #475569;">Best regards,<br/><strong>The TicketsHub Team</strong></p>
            </div>
            <div class="footer">
              <p>${options.footerNotice || 'You are receiving this operational email because you have an account on TicketsHub.'}</p>
              <p>&copy; ${new Date().getFullYear()} TicketsHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ----------------------------------------------------
// Specialized Event Email Templates
// ----------------------------------------------------

export function renderWelcomeTemplate(userName: string, userEmail: string, loginUrl: string) {
  const title = 'Welcome to TicketsHub 🎉';
  const html = generateBaseEmailHtml({
    recipientName: userName,
    recipientEmail: userEmail,
    title,
    bodyHtml: `
      <p>We are excited to welcome you to <strong>TicketsHub</strong> — your primary platform for primary tickets and secure resale marketplace!</p>
      <div class="card">
        <h4 style="margin: 0 0 12px 0; color: #0f172a;">What you can do with TicketsHub:</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Browse and purchase official tickets to upcoming live events</li>
          <li>Access verified dynamic anti-fraud QR codes</li>
          <li>Safely list tickets for resale on our seller marketplace</li>
          <li>Request instant payouts directly to your bank account or wallet</li>
        </ul>
      </div>
      <p>Log in now to explore events or manage your account profile.</p>
    `,
    ctaText: 'Access Your Account',
    ctaUrl: loginUrl
  });

  const text = `Hi ${userName || userEmail}, Welcome to TicketsHub! Explore events and manage your tickets at ${loginUrl}`;
  return { subject: title, html, text };
}

export function renderVerificationTemplate(userName: string, userEmail: string, verificationUrl: string) {
  const title = 'Verify Your Email Address ✉️';
  const html = generateBaseEmailHtml({
    recipientName: userName,
    recipientEmail: userEmail,
    title,
    bodyHtml: `
      <p>Thank you for registering with TicketsHub! Please confirm your email address to activate all account features, including purchasing and selling tickets.</p>
      <p>This verification link expires in <strong>24 hours</strong>.</p>
      <div class="card" style="word-break: break-all; font-size: 13px; color: #64748b;">
        Link: ${verificationUrl}
      </div>
    `,
    ctaText: 'Verify Email Address',
    ctaUrl: verificationUrl
  });

  const text = `Hi ${userName || userEmail}, Please verify your email for TicketsHub: ${verificationUrl}`;
  return { subject: 'Verify your email for TicketsHub 🎟️', html, text };
}

export function renderPasswordResetTemplate(userName: string, userEmail: string, resetUrl: string) {
  const title = 'Reset Your Password 🔑';
  const html = generateBaseEmailHtml({
    recipientName: userName,
    recipientEmail: userEmail,
    title,
    bodyHtml: `
      <p>We received a request to reset the password for your TicketsHub account.</p>
      <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
      <div class="card" style="word-break: break-all; font-size: 13px; color: #64748b;">
        If you didn't request this password reset, please ignore this email or contact support immediately.
      </div>
    `,
    ctaText: 'Reset Password',
    ctaUrl: resetUrl
  });

  const text = `Hi ${userName || userEmail}, Reset your TicketsHub password here: ${resetUrl}`;
  return { subject: 'Password Reset Request - TicketsHub 🎟️', html, text };
}

export function renderPasswordChangedTemplate(userName: string, userEmail: string) {
  const title = 'Password Successfully Changed 🔒';
  const html = generateBaseEmailHtml({
    recipientName: userName,
    recipientEmail: userEmail,
    title,
    bodyHtml: `
      <p>Your TicketsHub account password was successfully updated.</p>
      <p>If you made this change, no further action is required.</p>
      <div class="card" style="color: #ef4444; font-weight: 600;">
        If you did NOT change your password, please contact our security team immediately at support@ticketshub.com.
      </div>
    `
  });

  const text = `Hi ${userName || userEmail}, Your TicketsHub password was changed successfully. If you did not do this, contact support.`;
  return { subject: 'TicketsHub Password Changed Notification 🎟️', html, text };
}

export function renderOrderConfirmationTemplate(
  userName: string,
  userEmail: string,
  eventTitle: string,
  orderNumber: string,
  totalPrice: number,
  ticketCount: number,
  ticketsUrl: string
) {
  const title = `Order Confirmed: ${eventTitle} 🎟️`;
  const html = generateBaseEmailHtml({
    recipientName: userName,
    recipientEmail: userEmail,
    title,
    bodyHtml: `
      <p>Your payment was successful and your tickets have been issued!</p>
      <div class="card">
        <p style="margin: 4px 0;"><strong>Order Reference:</strong> #${orderNumber}</p>
        <p style="margin: 4px 0;"><strong>Event:</strong> ${eventTitle}</p>
        <p style="margin: 4px 0;"><strong>Tickets Issued:</strong> ${ticketCount}</p>
        <p style="margin: 4px 0;"><strong>Total Paid:</strong> ${totalPrice} EGP</p>
      </div>
      <p>Your anti-fraud QR code tickets are now ready in your TicketsHub mobile view & dashboard.</p>
    `,
    ctaText: 'View My Tickets',
    ctaUrl: ticketsUrl
  });

  const text = `Hi ${userName || userEmail}, Order #${orderNumber} confirmed for ${eventTitle}. View tickets: ${ticketsUrl}`;
  return { subject: `[TicketsHub] Order Confirmation #${orderNumber} - ${eventTitle}`, html, text };
}

export function renderResaleListingTemplate(
  sellerName: string,
  sellerEmail: string,
  eventTitle: string,
  ticketTypeName: string,
  listingPrice: number,
  publicId: string,
  dashboardUrl: string
) {
  const title = 'Ticket Listed for Resale 🎟️';
  const html = generateBaseEmailHtml({
    recipientName: sellerName,
    recipientEmail: sellerEmail,
    title,
    bodyHtml: `
      <p>Your ticket has been listed on the TicketsHub Resale Marketplace.</p>
      <div class="card">
        <p style="margin: 4px 0;"><strong>Event:</strong> ${eventTitle}</p>
        <p style="margin: 4px 0;"><strong>Ticket Type:</strong> ${ticketTypeName}</p>
        <p style="margin: 4px 0;"><strong>Listing Price:</strong> ${listingPrice} EGP</p>
        <p style="margin: 4px 0;"><strong>Listing Reference:</strong> ${publicId}</p>
      </div>
      <p>When a buyer purchases your ticket, you will be notified immediately and funds will be credited to your seller wallet.</p>
    `,
    ctaText: 'View Dashboard',
    ctaUrl: dashboardUrl
  });

  const text = `Hi ${sellerName || sellerEmail}, Ticket for ${eventTitle} listed for resale at ${listingPrice} EGP (Ref: ${publicId}).`;
  return { subject: `[TicketsHub] Ticket Listed for Resale - ${eventTitle}`, html, text };
}

export function renderResaleSoldTemplate(
  sellerName: string,
  sellerEmail: string,
  eventTitle: string,
  price: number,
  payoutAmount: number,
  publicId: string,
  walletUrl: string
) {
  const title = 'Ticket Sold on Resale Marketplace! 💰';
  const html = generateBaseEmailHtml({
    recipientName: sellerName,
    recipientEmail: sellerEmail,
    title,
    bodyHtml: `
      <p>Great news! A buyer has purchased your ticket for <strong>${eventTitle}</strong>.</p>
      <div class="card">
        <p style="margin: 4px 0;"><strong>Listing Ref:</strong> ${publicId}</p>
        <p style="margin: 4px 0;"><strong>Sale Price:</strong> ${price} EGP</p>
        <p style="margin: 4px 0;"><strong>Net Seller Credited:</strong> ${payoutAmount} EGP</p>
      </div>
      <p>The funds have been added to your pending seller balance and will be available for withdrawal according to settlement hold rules.</p>
    `,
    ctaText: 'Check Seller Wallet',
    ctaUrl: walletUrl
  });

  const text = `Hi ${sellerName || sellerEmail}, Your ticket for ${eventTitle} was sold! ${payoutAmount} EGP credited to your wallet.`;
  return { subject: `[TicketsHub] Ticket Sold! - ${eventTitle}`, html, text };
}

export function renderPayoutStatusTemplate(
  sellerName: string,
  sellerEmail: string,
  payoutRef: string,
  amount: number,
  status: 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED',
  reason?: string,
  walletUrl?: string
) {
  let title = 'Payout Status Update';
  let message = '';

  if (status === 'SUBMITTED') {
    title = 'Payout Request Received 💸';
    message = `We received your request to withdraw <strong>${amount} EGP</strong> (Ref: ${payoutRef}). Our finance team is reviewing it.`;
  } else if (status === 'APPROVED') {
    title = 'Payout Request Approved ✅';
    message = `Your withdrawal request for <strong>${amount} EGP</strong> (Ref: ${payoutRef}) has been approved and queued for transfer.`;
  } else if (status === 'PAID') {
    title = 'Payout Transferred 💰';
    message = `Your payout of <strong>${amount} EGP</strong> (Ref: ${payoutRef}) has been transferred to your designated account!`;
  } else if (status === 'REJECTED') {
    title = 'Payout Request Declined ❌';
    message = `Your request for <strong>${amount} EGP</strong> (Ref: ${payoutRef}) was rejected.${reason ? ` Reason: ${reason}` : ''} Funds are back in your wallet.`;
  }

  const html = generateBaseEmailHtml({
    recipientName: sellerName,
    recipientEmail: sellerEmail,
    title,
    bodyHtml: `
      <p>${message}</p>
      <div class="card">
        <p style="margin: 4px 0;"><strong>Reference ID:</strong> ${payoutRef}</p>
        <p style="margin: 4px 0;"><strong>Amount:</strong> ${amount} EGP</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> ${status}</p>
      </div>
    `,
    ctaText: 'View Seller Balance',
    ctaUrl: walletUrl || '#'
  });

  const text = `Hi ${sellerName || sellerEmail}, Payout ${payoutRef} status: ${status} for ${amount} EGP.`;
  return { subject: `[TicketsHub] Payout ${status} - ${payoutRef}`, html, text };
}

export function renderGenericAnnouncementTemplate(
  recipientName: string,
  recipientEmail: string,
  subject: string,
  messageHtml: string,
  ctaText?: string,
  ctaUrl?: string
) {
  const html = generateBaseEmailHtml({
    recipientName,
    recipientEmail,
    title: subject,
    bodyHtml: messageHtml,
    ctaText,
    ctaUrl
  });

  const text = `Hi ${recipientName || recipientEmail},\n\n${subject}\n\n${messageHtml.replace(/<[^>]+>/g, '')}`;
  return { subject: `[TicketsHub Announcement] ${subject}`, html, text };
}
