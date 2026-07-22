export interface AboutPageSettings {
  id?: string;
  heroEyebrow: string;
  heroTitle: string;
  heroImage: string;
  heroImageAlt: string;
  breadcrumbLabel: string;
  valuesSectionActive: boolean;
  teamHeading: string;
  teamDescription: string;
  teamSectionActive: boolean;
  pageActive: boolean;
  updatedAt?: string;
}

export interface AboutStoryBlock {
  id: string;
  text: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AboutValue {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AboutTeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  imageAlt: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AboutPagePayload {
  settings: AboutPageSettings;
  storyBlocks: AboutStoryBlock[];
  values: AboutValue[];
  teamMembers: AboutTeamMember[];
}

export const defaultSettings: AboutPageSettings = {
  heroEyebrow: 'ABOUT US',
  heroTitle: 'OUR STORY',
  heroImage: '',
  heroImageAlt: 'Colossal Rigout studio background',
  breadcrumbLabel: 'About Us',
  valuesSectionActive: true,
  teamHeading: 'BEHIND THE BRAND',
  teamDescription: 'The people who bring Colossal Rigout to life.',
  teamSectionActive: true,
  pageActive: true,
};

export const allowedValueIcons = ['leaf', 'shield', 'users', 'heart', 'sparkles', 'globe'] as const;

export function validateAboutImageSource(value?: string): string {
  const source = String(value || '').trim();
  if (!source) return '';
  if (/^https:\/\//i.test(source)) return source;
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(source) && source.length <= 750_000) return source;
  return '';
}
