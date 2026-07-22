export interface ContactPageSettings {
  id?: string;
  pageActive: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroImageAlt: string;
  breadcrumbLabel: string;
  formHeading: string;
  formDescription: string;
  submitButtonLabel: string;
  successHeading: string;
  successMessage: string;
  responseTimeText: string;
  contactDetailsActive: boolean;
  mapSectionActive: boolean;
  faqCtaActive: boolean;
  faqHeading: string;
  faqDescription: string;
  faqButtonLabel: string;
  faqButtonUrl: string;
  updatedAt?: string;
}

export interface ContactDetail {
  id: string;
  type: 'address' | 'phone' | 'email' | 'hours' | 'whatsapp' | 'custom';
  label: string;
  value: string;
  href?: string;
  icon: 'map-pin' | 'phone' | 'mail' | 'clock' | 'message-circle';
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactSubject {
  id: string;
  name: string;
  slug: string;
  recipientEmail?: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactMapSettings {
  mapImageUrl: string;
  mapImageAlt: string;
  mapUrl: string;
  ctaLabel: string;
  active: boolean;
  updatedAt?: string;
}

export type InquiryStatus = 'new' | 'in_progress' | 'resolved' | 'archived' | 'spam';
export type InquiryPriority = 'normal' | 'high';

export interface ContactInquiry {
  id: string;
  inquiryRef: string;
  name: string;
  email: string;
  phone?: string;
  orderId?: string;
  subjectId: string;
  subjectLabel: string;
  message: string;
  status: InquiryStatus;
  priority: InquiryPriority;
  assignedTo?: string | null;
  adminNotes?: string;
  source: 'contact_page';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface ContactPagePayload {
  settings: ContactPageSettings;
  details: ContactDetail[];
  subjects: ContactSubject[];
  map: ContactMapSettings;
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

export function generateInquiryRef(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INQ-${dateStr}-${rand}`;
}

export function validateContactHref(type: string, value: string, customHref?: string): string {
  if (customHref && customHref.trim()) {
    const trimmed = customHref.trim();
    if (trimmed.startsWith('tel:') || trimmed.startsWith('mailto:') || trimmed.startsWith('https://wa.me/') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
  }
  const cleanVal = value.trim();
  if (type === 'phone') {
    const digits = cleanVal.replace(/[^\d+]/g, '');
    return `tel:${digits}`;
  }
  if (type === 'email') {
    return `mailto:${cleanVal}`;
  }
  if (type === 'whatsapp') {
    const digits = cleanVal.replace(/[^\d]/g, '');
    return `https://wa.me/${digits}`;
  }
  return '';
}

export function validateInternalOrExternalUrl(urlStr?: string): string {
  if (!urlStr) return '';
  const trimmed = urlStr.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('javascript:')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return '';
}

export function validateContactImageSource(value?: string): string {
  const source = String(value || '').trim();
  if (!source) return '';
  if (/^https:\/\//i.test(source)) return source;
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(source) && source.length <= 750_000) return source;
  return '';
}

export const defaultContactSettings: ContactPageSettings = {
  pageActive: true,
  heroTitle: 'CONTACT US',
  heroSubtitle: "We'd love to hear from you.",
  heroImageUrl: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=1920&q=80',
  heroImageAlt: 'Contact us background image',
  breadcrumbLabel: 'Contact',
  formHeading: 'Send Us a Message',
  formDescription: 'Our team typically replies within 24 hours.',
  submitButtonLabel: 'SEND MESSAGE',
  successHeading: 'Thank You!',
  successMessage: "Your inquiry has been submitted successfully. We'll get back to you shortly.",
  responseTimeText: 'Typically replies within 24 hours',
  contactDetailsActive: true,
  mapSectionActive: true,
  faqCtaActive: true,
  faqHeading: 'Have a quick question?',
  faqDescription: 'Check our FAQ — most answers are just a click away.',
  faqButtonLabel: 'VISIT FAQ',
  faqButtonUrl: '/faq',
};

export const defaultContactMapSettings: ContactMapSettings = {
  mapImageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
  mapImageAlt: 'Gulberg Lahore Map Location',
  mapUrl: 'https://maps.google.com/?q=Gulberg+III+Lahore+Pakistan',
  ctaLabel: 'FIND A STORE NEAR YOU',
  active: true,
};
