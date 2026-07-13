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
        
        // Asynchronously check MX and SPF records to diagnose potential deliverability issues
        const mxRecords = await new Promise<dns.MxRecord[]>((resolve) => {
          dns.resolveMx(domain, (err, recs) => resolve(err ? [] : recs));
        });
        dnsRecords.hasMx = mxRecords.length > 0;
        
        const txtRecords = await new Promise<string[][]>((resolve) => {
          dns.resolveTxt(domain, (err, recs) => resolve(err ? [] : recs));
        });
        const flattenedTxt = txtRecords.flat();
        dnsRecords.hasSpf = flattenedTxt.some(txt => txt.includes('v=spf1'));
        dnsRecords.hasDmarc = await new Promise<boolean>((resolve) => {
          dns.resolveTxt(`_dmarc.${domain}`, (err, recs) => {
            if (err) return resolve(false);
            resolve(recs.flat().some(txt => txt.includes('v=DMARC1')));
          });
        });
      }
    } catch (dnsErr: any) {
      warnings.push(`Deliverability DNS verification test warning: ${dnsErr.message}`);
    }
  }

  return {
    valid: errors.length === 0 && mode !== 'UNCONFIGURED',
    mode,
    errors,
    warnings,
    dnsRecords
  };
}

/**
 * High-reliability email dispatch service.
 * Automatically switches between SMTP and Resend API.
 */
export async function sendEmail(options: SendEmailOptions, retries = 2): Promise<{ messageId?: string; success: boolean }> {
  const timestamp = new Date().toISOString();
  console.log(`\n📨 [MAIL START] Email dispatch requested at ${timestamp}`);
  console.log(`   To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
  console.log(`   Subject: "${options.subject}"`);

  const validation = await verifyEmailConfig();
  if (!validation.valid) {
    const errorMsg = `Configuration invalid for sender. Errors: ${validation.errors.join(' | ') || 'None'}. Mode: ${validation.mode}`;
    console.error(`🚨 [MAIL FATAL ERROR] ${errorMsg}`);
    throw new Error(`Email dispatch failed due to configuration errors: ${validation.errors.join(', ')}`);
  }

  const sender = process.env.SMTP_FROM || process.env.MAIL_FROM!;

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

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API returned non-okay response code: ${response.status}. Details: ${errorText}`);
  }

  const resData = await response.json() as any;
  if (!resData || !resData.id) {
    throw new Error(`Resend payload structure in response was invalid: ${JSON.stringify(resData)}`);
  }

  return resData.id;
}
