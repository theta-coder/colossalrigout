import { notFound, permanentRedirect } from 'next/navigation';
import { getProductById, getProductBySlug } from '@/lib/server/products';

interface LegacyProductPageProps {
  searchParams: Promise<{ id?: string; slug?: string }>;
}

export default async function LegacyProductPage({ searchParams }: LegacyProductPageProps) {
  const { id, slug } = await searchParams;
  const product = id
    ? await getProductById(id)
    : slug
      ? await getProductBySlug(slug)
      : null;

  if (!product?.slug) notFound();
  permanentRedirect(`/product/${encodeURIComponent(product.slug)}`);
}
