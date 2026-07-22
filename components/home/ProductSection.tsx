import React from 'react';
import { getHomepageProducts } from '@/lib/server/homepage';
import ProductCarouselClient from './ProductCarouselClient';

interface Props {
  type: 'new-arrivals' | 'best-sellers';
}

export default async function ProductSection({ type }: Props) {
  const { newArrivals, bestSellers } = await getHomepageProducts();

  if (type === 'new-arrivals') {
    if (!newArrivals || newArrivals.length === 0) return null;
    return (
      <ProductCarouselClient
        title="NEW ARRIVALS"
        subtitle="Fresh styles. Just in."
        viewAllHref="/shop?cat=new-arrival"
        products={newArrivals}
        showBestsellerBadge={false}
      />
    );
  }

  if (!bestSellers || bestSellers.length === 0) return null;
  return (
    <ProductCarouselClient
      title="BEST SELLERS"
      subtitle="Loved by our customers."
      viewAllHref="/shop?cat=best-seller"
      products={bestSellers}
      showBestsellerBadge={true}
    />
  );
}
