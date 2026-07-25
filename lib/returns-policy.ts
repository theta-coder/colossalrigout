export interface ReturnsPolicySettings {
  id?: string;
  pageTitle: string;
  breadcrumbLabel: string;
  windowTitle: string;
  windowDescription: string;
  conditionsHeading: string;
  stepsHeading: string;
  returnWindowDays?: number;
  productPageEnabled?: boolean;
  productPageSummary?: string;
  active: boolean;
  updatedAt?: string;
}

export interface ReturnCondition {
  id: string;
  text: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReturnStep {
  id: string;
  title: string;
  description: string;
  linkLabel?: string;
  linkPath?: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReturnInfoSection {
  id: string;
  title: string;
  description: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReturnSupportCta {
  id?: string;
  heading: string;
  description: string;
  buttonLabel: string;
  buttonPath: string;
  active: boolean;
  updatedAt?: string;
}

export interface ReturnsPolicyPayload {
  settings: ReturnsPolicySettings;
  conditions: ReturnCondition[];
  steps: ReturnStep[];
  infoSections: ReturnInfoSection[];
  cta: ReturnSupportCta;
}

export const defaultSettings: ReturnsPolicySettings = {
  pageTitle: 'RETURNS & EXCHANGES',
  breadcrumbLabel: 'Returns & Exchanges',
  windowTitle: '12-Hour Return Window',
  windowDescription: 'Customers may request a return or exchange within 12 hours of receiving their order. The request must be submitted through our Contact page. Items must remain unused, unwashed, and in their original condition with all tags and packaging attached.',
  conditionsHeading: 'Eligible Items',
  stepsHeading: 'How to Request a Return or Exchange',
  returnWindowDays: 1,
  productPageEnabled: true,
  productPageSummary: 'Easy returns within 12 hours of receiving your order. Item must meet our return conditions.',
  active: true,
};

export const defaultCta: ReturnSupportCta = {
  heading: 'Need Help?',
  description: 'For return or exchange assistance, contact our support team through the Contact page.',
  buttonLabel: 'CONTACT US',
  buttonPath: '/contact',
  active: true,
};

export function validateInternalPath(pathStr?: string): string {
  if (!pathStr) return '';
  const trimmed = pathStr.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('javascript:')) {
    return '';
  }
  return trimmed;
}
