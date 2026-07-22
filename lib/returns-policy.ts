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
  windowTitle: '30-Day Return Window',
  windowDescription: 'Not the right fit? Send it back within 30 days of delivery for a full refund or exchange.',
  conditionsHeading: 'Return Conditions',
  stepsHeading: 'How to Return an Item',
  returnWindowDays: 30,
  productPageEnabled: true,
  productPageSummary: 'Easy returns within return window. Item must meet our return conditions.',
  active: true,
};

export const defaultCta: ReturnSupportCta = {
  heading: 'Still have questions?',
  description: 'Our support team is happy to help with any return or exchange queries.',
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
