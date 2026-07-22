import React from 'react';
import { getActiveHeroSlides } from '@/lib/server/homepage';
import HeroCarouselClient from './HeroCarouselClient';

export default async function HeroSection() {
  const slides = await getActiveHeroSlides();

  if (!slides || slides.length === 0) {
    return null;
  }

  return <HeroCarouselClient slides={slides} />;
}
