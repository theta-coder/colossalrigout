import React from 'react';
import { getLatestApprovedReviews } from '@/lib/server/homepage';
import ReviewsCarouselClient from './ReviewsCarouselClient';

export default async function ReviewsSection() {
  const reviews = await getLatestApprovedReviews();

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return <ReviewsCarouselClient reviews={reviews} />;
}
