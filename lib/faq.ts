export interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqItem {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
