import nodemailer from 'nodemailer';
import dns from 'dns';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}

export interface VerificationResult {
  valid: boolean;
  mode: 'SMTP' | 'RESEND' | 'UNCONFIGURED';
  errors: string[];
  warnings: string[];
  dnsRecords?: any;
}

/**
 * Validates the email configuration and performs diagnostic checks.
 */
export async function verifyEmailConfig(): Promise<VerificationResult> {
  console.log(`[2] Starting verifyEmailConfig()`);
  console.log(`RESEND_API_KEY present: ${!!process.env.RESEND_API_KEY}`);
  console.log(`MAIL_FROM present: ${!!process.env.MAIL_FROM}`);
  console.log(`SMTP_FROM present: ${!!process.env.SMTP_FROM}`);

  const errors: string[] = [];
  const warnings: string[] = [];
  let mode: 'SMTP' | 'RESEND' | 'UNCONFIGURED' = 'UNCONFIGURED';

  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSmtpHost = !!process.env.SMTP_HOST;
  const hasSmtpUser = !!process.env.SMTP_USER;
  const hasSmtpPass = !!process.env.SMTP_PASS;

  if (hasResend) {
    mode = 'RESEND';
    if (!process.env.RESEND_API_KEY!.startsWith('re_')) {
      warnings.push('RESEND_API_KEY does not start with "re_", which is standard for Resend keys.');
    }
  } else if (hasSmtpHost || hasSmtpUser || hasSmtpPass) {
    mode = 'SMTP';
    if (!process.env.SMTP_HOST) errors.push('Missing SMTP_HOST.');
    if (!process.env.SMTP_PORT) {
      warnings.push('Missing SMTP_PORT. Defaulting to port 587 (submission).');
    } else {
      const port = parseInt(process.env.SMTP_PORT);
      if (port === 25) {
        warnings.push('SMTP_PORT is set to 25. Note that Vercel serverless environments block port 25 outbound. Use 587 or 465 instead.');
      }
    }
    if (!process.env.SMTP_USER) errors.push('Missing SMTP_USER.');
    if (!process.env.SMTP_PASS) errors.push('Missing SMTP_PASS.');
  }

  const fromAddress = process.env.SMTP_FROM || process.env.MAIL_FROM;
  if (!fromAddress) {
    errors.push('Missing sender identity. Please declare SMTP_FROM or MAIL_FROM in your environment variables.');
  } else {
    // Basic email pattern validate
    const senderEmailMatch = fromAddress.match(/<([^>]+)>/) || [null, fromAddress];
    const emailStr = senderEmailMatch[1];
    if (emailStr && !emailStr.includes('@')) {
      errors.push(`Sender identity is invalid: "${fromAddress}". It must contain a valid email address.`);
    }
  }

  // Domain DNS Deliverability Checks
  let dnsRecords: any = null;
  if (fromAddress && mode !== 'UNCONFIGURED') {
    try {
      const senderEmailMatch = fromAddress.match(/<([^>]+)>/) || [null, fromAddress];
      const emailStr = senderEmailMatch[1];
      if (emailStr && emailStr.includes('@')) {
        const domain = emailStr.split('@')[1].trim();
        dnsRecords = { domain };
        
        console.log(`[2.2] dns.resolveMx start for domain: ${domain}`);
        // Asynchronously check MX and SPF records to diagnose potential deliverability issues
        const mxRecords = await new Promise<dns.MxRecord[]>((resolve) => {
          const t = setTimeout(() => {
            console.log(`[2.2-timeout] dns.resolveMx timed out for domain: ${domain}`);
            resolve([]);
          }, 2000);
          dns.resolveMx(domain, (err, recs) => {
            clearTimeout(t);
            resolve(err ? [] : recs);
          });
        });
        console.log(`[2.3] dns.resolveMx end`);
        dnsRecords.hasMx = mxRecords.length > 0;
        
        console.log(`[2.4] dns.resolveTxt start for domain: ${domain}`);
        const txtRecords = await new Promise<string[][]>((resolve) => {
          const t = setTimeout(() => {
            console.log(`[2.4-timeout] dns.resolveTxt timed out for domain: ${domain}`);
            resolve([]);
          }, 2000);
          dns.resolveTxt(domain, (err, recs) => {
            clearTimeout(t);
            resolve(err ? [] : recs);
          });
        });
        console.log(`[2.5] dns.resolveTxt end`);
        const flattenedTxt = txtRecords.flat();
        dnsRecords.hasSpf = flattenedTxt.some(txt => txt.includes('v=spf1'));
        
        console.log(`[2.6] dns.resolveTxt dmarc start for domain: _dmarc.${domain}`);
        dnsRecords.hasDmarc = await new Promise<boolean>((resolve) => {
          const t = setTimeout(() => {
            console.log(`[2.6-timeout] dns.resolveTxt dmarc timed out for domain: _dmarc.${domain}`);
            resolve(false);
          }, 2000);
          dns.resolveTxt(`_dmarc.${domain}`, (err, recs) => {
            clearTimeout(t);
            if (err) return resolve(false);
            resolve(recs.flat().some(txt => txt.includes('v=DMARC1')));
          });
        });
        console.log(`[2.7] dns.resolveTxt dmarc end`);
      }
    } catch (dnsErr: any) {
      warnings.push(`Deliverability DNS verification test warning: ${dnsErr.message}`);
    }
  }

  const result = {
    valid: errors.length === 0 && mode !== 'UNCONFIGURED',
    mode,
    errors,
    warnings,
    dnsRecords
  };
  console.log(`[3] verifyEmailConfig finished. Valid: ${result.valid}, Mode: ${result.mode}`);
  if (!result.valid) {
    console.log(`verifyEmailConfig invalid details - Mode: ${result.mode}, Errors: ${JSON.stringify(result.errors)}, Warnings: ${JSON.stringify(result.warnings)}`);
  }
  return result;
}

/**
 * High-reliability email dispatch service.
 * Automatically switches between SMTP and Resend API.
 */
export async function sendEmail(options: SendEmailOptions, retries = 2): Promise<{ messageId?: string; success: boolean }> {
  console.log(`[1] Enter sendEmail()`);
  const timestamp = new Date().toISOString();
  console.log(`\n📨 [MAIL START] Email dispatch requested at ${timestamp}`);
  console.log(`   To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
  console.log(`   Subject: "${options.subject}"`);

  const validation = await verifyEmailConfig();
  console.log(`[4] validation.mode = ${validation.mode}`);
  console.log(`[5] validation.valid = ${validation.valid}`);
  if (!validation.valid) {
    const errorMsg = `Configuration invalid for sender. Errors: ${validation.errors.join(' | ') || 'None'}. Mode: ${validation.mode}`;
    console.error(`🚨 [MAIL FATAL ERROR] ${errorMsg}`);
    throw new Error(`Email dispatch failed due to configuration errors: ${validation.errors.join(', ')}`);
  }

  console.log(`[EMAIL STEP 7] Using ${validation.mode} mode`);

  const sender = process.env.SMTP_FROM || process.env.MAIL_FROM!;
  console.log(`[6] Selected sender = ${sender}`);

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      if (validation.mode === 'RESEND') {
        const messageId = await sendViaResend(sender, options);
        console.log(`✨ [MAIL SUCCESS] Email sent successfully via Resend API. Message ID: ${messageId}`);
        return { success: true, messageId };
      } else {
        const messageId = await sendViaSmtp(sender, options);
        console.log(`✨ [MAIL SUCCESS] Email sent successfully via SMTP. Message ID: ${messageId}`);
        return { success: true, messageId };
      }
    } catch (err: any) {
      console.warn(`⚠️ [MAIL WARN] Try Attempt ${attempt}/${retries + 1} failed: ${err.message}`);
      if (attempt > retries) {
        console.error(`🚨 [MAIL FATAL EXCEPTION] All dispatch attempts exhausted for recipient ${options.to}. Final Error: ${err.stack || err.message}`);
        throw err;
      }
      const backoffMs = attempt * 1500;
      console.log(`   Backing off for ${backoffMs}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  console.error('🚨 [MAIL FATAL] sendEmail completed retry loop without throwing but returned success: false');
  return { success: false };
}

/**
 * Standard Node SMTP Email logic using Nodemailer
 */
async function sendViaSmtp(from: string, options: SendEmailOptions): Promise<string> {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = port === 465; // true for 465, false for 587 or others

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Prevent hanging sockets on unresponsive SMTP servers
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      // Avoid server certificate failures for typical managed relays
      rejectUnauthorized: false
    }
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''), // Default text fallback if none provided
    attachments: options.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType
    }))
  };

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}

/**
 * Modern cloud transactional service sending via Resend HTTP Post
 */
async function sendViaResend(from: string, options: SendEmailOptions): Promise<string> {
  console.log(`[7] Enter sendViaResend()`);
  console.log(`[8] Preparing payload`);
  const payload: any = {
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, '')
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map(att => ({
      filename: att.filename,
      content: Buffer.isBuffer(att.content) 
        ? att.content.toString('base64') 
        : Buffer.from(att.content).toString('base64'),
    }));
  }

  console.log(`[EMAIL STEP 8] Sending POST https://api.resend.com/emails`);
  console.log(`[RESEND REQUEST] Payload size: ${JSON.stringify(payload).length} bytes. Sender: ${from}. Recipient: ${JSON.stringify(payload.to)}`);
  console.log(`[RESEND REQUEST START] Initiating dispatch to Resend API. Size: ${JSON.stringify(payload).length} bytes. Sender: ${from}. Recipient: ${JSON.stringify(payload.to)}`);

  console.log(`[10] About to call fetch()`);
  const fetchStart = Date.now();
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const fetchEnd = Date.now();
    console.log(`[11] fetch() returned. Duration: ${fetchEnd - fetchStart}ms`);
    console.log(`[EMAIL STEP 9] HTTP Status ${response.status}`);
    console.log(`[RESEND RESPONSE] Status: ${response.status}`);
    console.log(`[RESEND RESPONSE HTTP_STATUS: ${response.status}]`);

    const responseText = await response.text();
    console.log(`[13] Response text = ${responseText}`);

    if (!response.ok) {
      throw new Error(`Resend API returned non-okay response code: ${response.status}. Details: ${responseText}`);
    }

    const resData = JSON.parse(responseText) as any;
    console.log(`[14] Parsed JSON = ${JSON.stringify(resData)}`);
    if (!resData || !resData.id) {
      throw new Error(`Resend payload structure in response was invalid: ${responseText}`);
    }

    const messageId = resData.id;
    console.log(`[EMAIL STEP 10] Message ID ${messageId}`);
    console.log(`[MESSAGE ID: ${messageId}] Email dispatch completed successfully via Resend API.`);
    return messageId;
  } catch (fetchErr: any) {
    console.error(`[FULL ERROR] Resend dispatch failed. Exception: ${fetchErr.stack || fetchErr.message || fetchErr}`);
    throw fetchErr;
  }
}

/**
 * Standardizes name presentation for customer-facing emails.
 * Only falls back to the email address if absolutely no name exists.
 * Trims whitespace and prevents placeholders like undefined/null.
 */
export function getPersonalizedName(name?: string | null, email?: string | null): string {
  if (name) {
    const trimmed = name.trim();
    if (
      trimmed && 
      trimmed.toLowerCase() !== 'undefined' && 
      trimmed.toLowerCase() !== 'null' && 
      trimmed !== '""' && 
      trimmed !== "''"
    ) {
      return trimmed;
    }
  }
  if (email) {
    const trimmedEmail = email.trim();
    if (
      trimmedEmail && 
      trimmedEmail.toLowerCase() !== 'undefined' && 
      trimmedEmail.toLowerCase() !== 'null' && 
      trimmedEmail !== '""' && 
      trimmedEmail !== "''"
    ) {
      return trimmedEmail;
    }
  }
  return 'Valued Customer';
}

export interface EmailTemplateOptions {
  recipientName: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Reusable HTML template matching TicketsHub styling.
 */
export function generateEmailHtml(options: EmailTemplateOptions): string {
  const brandColor = '#10B981';
  const headerBg = '#0A0F0E';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${options.preheader ? `<title>${options.preheader}</title>` : ''}
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #51545e; margin: 0; padding: 0; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f4f4f7; padding-bottom: 40px; }
          .content { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
          .header { background-color: ${headerBg}; padding: 32px; text-align: center; border-bottom: 2px solid #1E2D2A; }
          .header h1 { color: ${brandColor}; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: 0.05em; text-decoration: none; }
          .body { padding: 32px; line-height: 1.6; }
          .body h2 { color: #1E2D2A; font-size: 20px; margin-top: 0; }
          .btn { display: inline-block; background-color: ${brandColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 6px; margin: 24px 0; text-align: center; }
          .footer { text-align: center; padding: 24px; font-size: 12px; color: #94a3b8; }
          ul { padding-left: 20px; margin: 16px 0; }
          li { margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="content">
            <div class="header">
              <h1 style="color: ${brandColor};">🎟️ TicketsHub</h1>
            </div>
            <div class="body">
              <h2>${options.title}</h2>
              <p>Hi ${options.recipientName},</p>
              ${options.bodyHtml}
              ${options.ctaUrl && options.ctaText ? `
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${options.ctaUrl}" class="btn" style="color: #ffffff; text-decoration: none;">${options.ctaText}</a>
                </div>
              ` : ''}
              <p>Warm regards,<br/>The TicketsHub Team</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 TicketsHub Inc. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export interface WelcomeTemplateData {
  title: string;
  intro: string;
  featuresTitle: string;
  features: string[];
  closing: string;
  ctaText: string;
  ctaUrl: string;
}

/**
 * Automates emailing welcome notifications to registered users.
 * Does not block registration flow, logging successes and failures cleanly.
 */
export async function sendWelcomeEmail(
  recipient: string,
  userName: string,
  subject: string,
  templateData: WelcomeTemplateData,
  userId: number | string
): Promise<{ success: boolean; messageId?: string }> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📨 Welcome email queued | User ID: ${userId} | Email: ${recipient}`);

  const recipientName = getPersonalizedName(userName, recipient);

  const featuresHtml = templateData.features.map(f => `<li>${f}</li>`).join('');
  const htmlText = generateEmailHtml({
    recipientName,
    title: templateData.title,
    bodyHtml: `
      <p>${templateData.intro}</p>
      <h3 style="color: #1E2D2A; font-size: 16px; margin-top: 24px; margin-bottom: 12px;">${templateData.featuresTitle}</h3>
      <ul style="margin: 12px 0; padding-left: 20px; line-height: 1.6;">
        ${featuresHtml}
      </ul>
      <p>${templateData.closing}</p>
    `,
    ctaText: templateData.ctaText,
    ctaUrl: templateData.ctaUrl
  });

  const plainTextFeatures = templateData.features.map(f => `- ${f}`).join('\n');
  const plainText = `
Hi ${recipientName},

${templateData.title}

${templateData.intro}

${templateData.featuresTitle}:
${plainTextFeatures}

${templateData.closing}

Access here: ${templateData.ctaUrl}

Best regards,
The TicketsHub Team
  `.trim();

  try {
    const res = await sendEmail({
      to: recipient,
      subject,
      html: htmlText,
      text: plainText
    });
    
    const successTimestamp = new Date().toISOString();
    console.log(`[${successTimestamp}] ✅ Welcome email sent | User ID: ${userId} | Email: ${recipient} | Message ID: ${res.messageId || 'n/a'}`);
    return res;
  } catch (err: any) {
    const failTimestamp = new Date().toISOString();
    console.error(`[${failTimestamp}] ⚠️ Welcome email failed | User ID: ${userId} | Email: ${recipient} | Error: ${err.message}`);
    return { success: false };
  }
}

export async function sendVerificationEmail(
  recipient: string,
  userName: string,
  verificationUrl: string,
  userId: number | string
): Promise<{ success: boolean; messageId?: string }> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📨 Verification email queued | User ID: ${userId} | Email: ${recipient}`);

  const recipientName = getPersonalizedName(userName, recipient);

  const htmlText = generateEmailHtml({
    recipientName,
    title: 'Verify Your Email Address ✉️',
    bodyHtml: `
      <p>Thank you for signing up with TicketsHub! To finalize your registration and secure your account, please verify your email address by clicking the button below.</p>
      <p>This verification link is valid for <strong>24 hours</strong>. If you do not verify your email address, you will not be able to purchase tickets or perform other sensitive operations on our platform.</p>
      <p>If the button doesn't work, copy and paste the link below into your browser:</p>
      <p style="word-break: break-all; font-size: 13px; color: #64748b;">${verificationUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 13px; color: #64748b;">If you did not register for a TicketsHub account, you can safely ignore this email.</p>
    `,
    ctaText: 'Verify Email',
    ctaUrl: verificationUrl
  });

  const plainText = `
Hi ${recipientName},

Verify Your Email Address ✉️

Thank you for signing up with TicketsHub! To finalize your registration and secure your account, please verify your email address by clicking the link below:

${verificationUrl}

This verification link is valid for 24 hours.

If you did not register for a TicketsHub account, you can safely ignore this email.

Best regards,
The TicketsHub Team
  `.trim();

  try {
    const res = await sendEmail({
      to: recipient,
      subject: 'Verify your email for TicketsHub 🎟️',
      html: htmlText,
      text: plainText
    });
    
    const successTimestamp = new Date().toISOString();
    console.log(`[${successTimestamp}] ✅ Verification email sent | User ID: ${userId} | Email: ${recipient} | Message ID: ${res.messageId || 'n/a'}`);
    return res;
  } catch (err: any) {
    const failTimestamp = new Date().toISOString();
    console.error(`[${failTimestamp}] ⚠️ Verification email failed | User ID: ${userId} | Email: ${recipient} | Error: ${err.message}`);
    return { success: false };
  }
}


