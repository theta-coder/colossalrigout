/**
 * lib/storefront-settings.ts
 * 
 * Shared TypeScript interfaces, default settings, normalization,
 * URL validation, and template interpolation helpers for Storefront Content.
 */

export interface AnnouncementSettings {
  id: 'announcement';
  enabled: boolean;
  message: string;
  secondaryMessage: string;
  separator: string;
  linkLabel: string;
  linkHref: string;
  openInNewTab: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface NewsletterSettings {
  id: 'newsletter';
  enabled: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  couponCode: string;
  inputPlaceholder: string;
  buttonLabel: string;
  successMessage: string;
  termsText: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FooterSocialLink {
  id: string;
  platform: 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'x' | 'custom';
  label: string;
  url: string;
  enabled: boolean;
  order: number;
}

export interface FooterPillar {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
}

export interface FooterSettings {
  id: 'footer';
  brandName: string;
  brandAccentText: string;
  brandDescription: string;
  websiteLabel: string;
  socialLinks: FooterSocialLink[];
  pillars: FooterPillar[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface StorefrontSettingsBundle {
  announcement: AnnouncementSettings;
  newsletter: NewsletterSettings;
  footer: FooterSettings;
}

/* ────────────── Defaults ────────────── */

export const DEFAULT_ANNOUNCEMENT_SETTINGS: AnnouncementSettings = {
  id: 'announcement',
  enabled: true,
  message: 'FREE SHIPPING ON ORDERS OVER PKR 5,000',
  secondaryMessage: 'EASY RETURNS',
  separator: '|',
  linkLabel: '',
  linkHref: '',
  openInNewTab: false,
};

export const DEFAULT_NEWSLETTER_SETTINGS: NewsletterSettings = {
  id: 'newsletter',
  enabled: true,
  eyebrow: '',
  heading: 'GET 10% OFF YOUR FIRST ORDER',
  description: 'Subscribe to our newsletter for exclusive offers and new arrivals.',
  discountType: 'percentage',
  discountValue: 10,
  couponCode: 'WELCOME10',
  inputPlaceholder: 'Enter your email',
  buttonLabel: 'SUBSCRIBE',
  successMessage: 'Thanks for subscribing! Use {{couponCode}} for {{discountLabel}}.',
  termsText: '',
};

export const DEFAULT_FOOTER_SETTINGS: FooterSettings = {
  id: 'footer',
  brandName: 'Colossal',
  brandAccentText: 'Rigout',
  brandDescription: 'Trendy pieces, timeless style. Wear your confidence with Colossal Rigout.',
  websiteLabel: 'colossalrigout.pk',
  socialLinks: [
    { id: 'instagram', platform: 'instagram', label: 'IG', url: '', enabled: true, order: 1 },
    { id: 'facebook', platform: 'facebook', label: 'FB', url: '', enabled: true, order: 2 },
    { id: 'youtube', platform: 'youtube', label: 'YT', url: '', enabled: true, order: 3 },
  ],
  pillars: [
    { id: 'sustainable-materials', title: 'SUSTAINABLE MATERIALS', description: 'Better for you. Better for the planet.', enabled: true, order: 1 },
    { id: 'ethical-production', title: 'ETHICAL PRODUCTION', description: 'Made with care and respect.', enabled: true, order: 2 },
    { id: 'community-focused', title: 'COMMUNITY FOCUSED', description: 'Fashion that gives back.', enabled: true, order: 3 },
  ],
};

/* ────────────── Validation & Safety Helpers ────────────── */

export function isValidUrlOrPath(href: string): boolean {
  if (!href) return true; // empty is allowed
  const trimmed = href.trim();
  if (trimmed === '') return true;

  // Reject dangerous protocols or relative forms
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\')
  ) {
    return false;
  }

  // Safe internal path must start with single '/'
  if (trimmed.startsWith('/')) {
    return true;
  }

  // External URL must start with https:// (or http:// in dev)
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeCouponCode(code: string): string {
  if (!code) return '';
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
}

export function interpolateNewsletterMessage(
  template: string,
  couponCode: string,
  discountType: 'percentage' | 'fixed' | 'none',
  discountValue: number
): string {
  const normCoupon = normalizeCouponCode(couponCode);

  let discountLabel = 'discount';
  let formattedValue = '';

  if (discountType === 'percentage') {
    formattedValue = `${discountValue}%`;
    discountLabel = `${discountValue}% off`;
  } else if (discountType === 'fixed') {
    formattedValue = `$${discountValue}`;
    discountLabel = `$${discountValue} off`;
  } else {
    formattedValue = '';
    discountLabel = 'special offer';
  }

  return (template || DEFAULT_NEWSLETTER_SETTINGS.successMessage)
    .replace(/\{\{couponCode\}\}/g, normCoupon)
    .replace(/\{\{discountValue\}\}/g, formattedValue)
    .replace(/\{\{discountLabel\}\}/g, discountLabel);
}

/* ────────────── Normalization Helpers ────────────── */

export function normalizeAnnouncementSettings(data: any): AnnouncementSettings {
  if (!data || typeof data !== 'object') return { ...DEFAULT_ANNOUNCEMENT_SETTINGS };
  const storedMessage = typeof data.message === 'string' ? data.message.trim() : '';
  const message = (storedMessage === 'FREE SHIPPING ON ORDERS OVER $75' || storedMessage.includes('$75'))
    ? DEFAULT_ANNOUNCEMENT_SETTINGS.message
    : storedMessage.replace(/\$75/g, 'PKR 5,000') || DEFAULT_ANNOUNCEMENT_SETTINGS.message;

  return {
    id: 'announcement',
    enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_ANNOUNCEMENT_SETTINGS.enabled,
    message,
    secondaryMessage: typeof data.secondaryMessage === 'string' ? data.secondaryMessage.trim() : DEFAULT_ANNOUNCEMENT_SETTINGS.secondaryMessage,
    separator: typeof data.separator === 'string' ? data.separator : DEFAULT_ANNOUNCEMENT_SETTINGS.separator,
    linkLabel: typeof data.linkLabel === 'string' ? data.linkLabel.trim() : DEFAULT_ANNOUNCEMENT_SETTINGS.linkLabel,
    linkHref: typeof data.linkHref === 'string' && isValidUrlOrPath(data.linkHref) ? data.linkHref.trim() : DEFAULT_ANNOUNCEMENT_SETTINGS.linkHref,
    openInNewTab: typeof data.openInNewTab === 'boolean' ? data.openInNewTab : DEFAULT_ANNOUNCEMENT_SETTINGS.openInNewTab,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export function normalizeNewsletterSettings(data: any): NewsletterSettings {
  if (!data || typeof data !== 'object') return { ...DEFAULT_NEWSLETTER_SETTINGS };

  const validDiscountTypes: Array<'percentage' | 'fixed' | 'none'> = ['percentage', 'fixed', 'none'];
  const discountType = validDiscountTypes.includes(data.discountType) ? data.discountType : DEFAULT_NEWSLETTER_SETTINGS.discountType;

  const rawVal = Number(data.discountValue);
  const discountValue = Number.isFinite(rawVal) && rawVal >= 0 ? rawVal : DEFAULT_NEWSLETTER_SETTINGS.discountValue;

  return {
    id: 'newsletter',
    enabled: typeof data.enabled === 'boolean' ? data.enabled : DEFAULT_NEWSLETTER_SETTINGS.enabled,
    eyebrow: typeof data.eyebrow === 'string' ? data.eyebrow.trim() : DEFAULT_NEWSLETTER_SETTINGS.eyebrow,
    heading: typeof data.heading === 'string' ? data.heading.trim() : DEFAULT_NEWSLETTER_SETTINGS.heading,
    description: typeof data.description === 'string' ? data.description.trim() : DEFAULT_NEWSLETTER_SETTINGS.description,
    discountType,
    discountValue,
    couponCode: typeof data.couponCode === 'string' ? normalizeCouponCode(data.couponCode) : DEFAULT_NEWSLETTER_SETTINGS.couponCode,
    inputPlaceholder: typeof data.inputPlaceholder === 'string' ? data.inputPlaceholder.trim() : DEFAULT_NEWSLETTER_SETTINGS.inputPlaceholder,
    buttonLabel: typeof data.buttonLabel === 'string' ? data.buttonLabel.trim() : DEFAULT_NEWSLETTER_SETTINGS.buttonLabel,
    successMessage: typeof data.successMessage === 'string' ? data.successMessage.trim() : DEFAULT_NEWSLETTER_SETTINGS.successMessage,
    termsText: typeof data.termsText === 'string' ? data.termsText.trim() : DEFAULT_NEWSLETTER_SETTINGS.termsText,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export function normalizeFooterSettings(data: any): FooterSettings {
  if (!data || typeof data !== 'object') return { ...DEFAULT_FOOTER_SETTINGS };

  const validPlatforms = ['instagram', 'facebook', 'youtube', 'tiktok', 'x', 'custom'];

  let socialLinks: FooterSocialLink[] = DEFAULT_FOOTER_SETTINGS.socialLinks;
  if (Array.isArray(data.socialLinks)) {
    socialLinks = data.socialLinks
      .map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return null;
        const platform = validPlatforms.includes(item.platform) ? item.platform : 'custom';
        const url = typeof item.url === 'string' && isValidUrlOrPath(item.url) ? item.url.trim() : '';
        return {
          id: String(item.id || `social-${idx}`).trim(),
          platform,
          label: typeof item.label === 'string' ? item.label.trim().slice(0, 10) : platform.toUpperCase().slice(0, 10),
          url,
          enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
          order: Number.isFinite(Number(item.order)) ? Number(item.order) : idx + 1,
        } as FooterSocialLink;
      })
      .filter((item: FooterSocialLink | null): item is FooterSocialLink => item !== null)
      .slice(0, 8);
  }

  let pillars: FooterPillar[] = DEFAULT_FOOTER_SETTINGS.pillars;
  if (Array.isArray(data.pillars)) {
    pillars = data.pillars
      .map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return null;
        return {
          id: String(item.id || `pillar-${idx}`).trim(),
          title: typeof item.title === 'string' ? item.title.trim().slice(0, 60) : '',
          description: typeof item.description === 'string' ? item.description.trim().slice(0, 160) : '',
          enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
          order: Number.isFinite(Number(item.order)) ? Number(item.order) : idx + 1,
        } as FooterPillar;
      })
      .filter((item: FooterPillar | null): item is FooterPillar => item !== null)
      .slice(0, 6);
  }

  return {
    id: 'footer',
    brandName: typeof data.brandName === 'string' ? data.brandName.trim() : DEFAULT_FOOTER_SETTINGS.brandName,
    brandAccentText: typeof data.brandAccentText === 'string' ? data.brandAccentText.trim() : DEFAULT_FOOTER_SETTINGS.brandAccentText,
    brandDescription: typeof data.brandDescription === 'string' ? data.brandDescription.trim() : DEFAULT_FOOTER_SETTINGS.brandDescription,
    websiteLabel: typeof data.websiteLabel === 'string' ? data.websiteLabel.trim() : DEFAULT_FOOTER_SETTINGS.websiteLabel,
    socialLinks,
    pillars,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

/* ────────────── Server Validation Functions ────────────── */

export function validateAnnouncementInput(data: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (data.enabled) {
    if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
      errors.message = 'Primary announcement message is required when enabled.';
    } else if (data.message.trim().length > 140) {
      errors.message = 'Message must be at most 140 characters.';
    }
  }

  if (data.secondaryMessage && typeof data.secondaryMessage === 'string' && data.secondaryMessage.trim().length > 100) {
    errors.secondaryMessage = 'Secondary message must be at most 100 characters.';
  }

  if (data.separator && typeof data.separator === 'string' && data.separator.length > 5) {
    errors.separator = 'Separator must be at most 5 characters.';
  }

  if (data.linkLabel && typeof data.linkLabel === 'string' && data.linkLabel.trim().length > 40) {
    errors.linkLabel = 'Link label must be at most 40 characters.';
  }

  if (data.linkHref && typeof data.linkHref === 'string' && data.linkHref.trim()) {
    if (!isValidUrlOrPath(data.linkHref)) {
      errors.linkHref = 'Link URL must be a valid internal path (starting with /) or https:// URL.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateNewsletterInput(data: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (data.enabled) {
    if (!data.heading || typeof data.heading !== 'string' || !data.heading.trim()) {
      errors.heading = 'Newsletter heading is required when enabled.';
    } else if (data.heading.trim().length > 100) {
      errors.heading = 'Heading must be at most 100 characters.';
    }
  }

  if (data.description && typeof data.description === 'string' && data.description.trim().length > 240) {
    errors.description = 'Description must be at most 240 characters.';
  }

  if (data.discountType && !['percentage', 'fixed', 'none'].includes(data.discountType)) {
    errors.discountType = 'Invalid discount type.';
  }

  if (data.discountType === 'percentage') {
    const val = Number(data.discountValue);
    if (isNaN(val) || val <= 0 || val > 100) {
      errors.discountValue = 'Percentage discount must be between 1 and 100.';
    }
  } else if (data.discountType === 'fixed') {
    const val = Number(data.discountValue);
    if (isNaN(val) || val <= 0 || val > 100000) {
      errors.discountValue = 'Fixed discount amount must be greater than 0.';
    }
  }

  if (data.couponCode && typeof data.couponCode === 'string') {
    const norm = normalizeCouponCode(data.couponCode);
    if (data.couponCode.trim() && norm !== data.couponCode.trim().toUpperCase()) {
      errors.couponCode = 'Coupon code contains invalid characters. Only A-Z, 0-9, _, - are allowed.';
    }
  }

  if (!data.buttonLabel || typeof data.buttonLabel !== 'string' || !data.buttonLabel.trim()) {
    errors.buttonLabel = 'Button label is required.';
  } else if (data.buttonLabel.trim().length > 30) {
    errors.buttonLabel = 'Button label must be at most 30 characters.';
  }

  if (data.inputPlaceholder && typeof data.inputPlaceholder === 'string' && data.inputPlaceholder.trim().length > 60) {
    errors.inputPlaceholder = 'Input placeholder must be at most 60 characters.';
  }

  if (data.successMessage && typeof data.successMessage === 'string' && data.successMessage.trim().length > 240) {
    errors.successMessage = 'Success message must be at most 240 characters.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateFooterInput(data: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (data.brandName && typeof data.brandName === 'string' && data.brandName.trim().length > 60) {
    errors.brandName = 'Brand name must be at most 60 characters.';
  }

  if (data.brandAccentText && typeof data.brandAccentText === 'string' && data.brandAccentText.trim().length > 60) {
    errors.brandAccentText = 'Brand accent text must be at most 60 characters.';
  }

  if (data.brandDescription && typeof data.brandDescription === 'string' && data.brandDescription.trim().length > 300) {
    errors.brandDescription = 'Brand description must be at most 300 characters.';
  }

  if (data.websiteLabel && typeof data.websiteLabel === 'string' && data.websiteLabel.trim().length > 100) {
    errors.websiteLabel = 'Website label must be at most 100 characters.';
  }

  if (Array.isArray(data.socialLinks)) {
    if (data.socialLinks.length > 8) {
      errors.socialLinks = 'Maximum of 8 social links allowed.';
    }
    data.socialLinks.forEach((link: any, idx: number) => {
      if (link.url && !isValidUrlOrPath(link.url)) {
        errors[`socialLink_${idx}_url`] = `Social link #${idx + 1} URL must be a valid https:// URL or internal path.`;
      }
    });
  }

  if (Array.isArray(data.pillars)) {
    if (data.pillars.length > 6) {
      errors.pillars = 'Maximum of 6 promotional pillars allowed.';
    }
    data.pillars.forEach((p: any, idx: number) => {
      if (p.enabled && (!p.title || !p.title.trim())) {
        errors[`pillar_${idx}_title`] = `Pillar #${idx + 1} title is required when enabled.`;
      }
    });
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
