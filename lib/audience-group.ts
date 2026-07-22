export interface AudienceGroup {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
