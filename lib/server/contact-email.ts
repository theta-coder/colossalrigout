import nodemailer from 'nodemailer';

type ContactEmailInput = {
  inquiryRef: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  adminRecipient?: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

const gmailUser = process.env.GMAIL_USER || 'colossalrigout@gmail.com';
const gmailAppPass = process.env.GMAIL_APP_PASSWORD || '';

function getTransporter() {
  if (!gmailAppPass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPass },
  });
}

async function sendGmailEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  if (!transporter || !to) return 'not_configured' as const;
  await transporter.sendMail({
    from: `"Colossal Rigout" <${gmailUser}>`,
    to,
    subject,
    html,
  });
  return 'sent' as const;
}

export async function sendContactNotifications(input: ContactEmailInput) {
  const safeName = escapeHtml(input.name);
  const safeRef = escapeHtml(input.inquiryRef);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');
  const adminRecipient = input.adminRecipient || process.env.CONTACT_ADMIN_EMAIL || process.env.ADMIN_ALERT_EMAIL || '';

  const customer = await sendGmailEmail(
    input.email,
    `We received your inquiry ${input.inquiryRef}`,
    `<p>Hi ${safeName},</p><p>Thank you for contacting Colossal Rigout. Your reference is <strong>${safeRef}</strong>.</p><p>Our team will respond as soon as possible.</p>`,
  ).catch(() => 'failed' as const);

  const admin = await sendGmailEmail(
    adminRecipient,
    `New contact inquiry: ${input.inquiryRef} — ${input.subject}`,
    `<p><strong>Customer:</strong> ${safeName} (${escapeHtml(input.email)})</p><p><strong>Reference:</strong> ${safeRef}</p><p><strong>Subject:</strong> ${safeSubject}</p><p>${safeMessage}</p>`,
  ).catch(() => 'failed' as const);

  return { customer, admin };
}
