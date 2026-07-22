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

async function sendResendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM || process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from || !to) return 'not_configured' as const;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
  return 'sent' as const;
}

export async function sendContactNotifications(input: ContactEmailInput) {
  const safeName = escapeHtml(input.name);
  const safeRef = escapeHtml(input.inquiryRef);
  const safeSubject = escapeHtml(input.subject);
  const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br />');
  const adminRecipient = input.adminRecipient || process.env.CONTACT_ADMIN_EMAIL || '';

  const customer = await sendResendEmail(
    input.email,
    `We received your inquiry ${input.inquiryRef}`,
    `<p>Hi ${safeName},</p><p>Thank you for contacting Colossal Rigout. Your reference is <strong>${safeRef}</strong>.</p><p>Our team will respond as soon as possible.</p>`,
  ).catch(() => 'failed' as const);

  const admin = await sendResendEmail(
    adminRecipient,
    `New contact inquiry: ${input.inquiryRef} — ${input.subject}`,
    `<p><strong>Customer:</strong> ${safeName} (${escapeHtml(input.email)})</p><p><strong>Reference:</strong> ${safeRef}</p><p><strong>Subject:</strong> ${safeSubject}</p><p>${safeMessage}</p>`,
  ).catch(() => 'failed' as const);

  return { customer, admin };
}
