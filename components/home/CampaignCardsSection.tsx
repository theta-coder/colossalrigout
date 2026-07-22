import React from 'react';
import { getActiveCampaignCards } from '@/lib/server/homepage';
import CampaignCardsCarousel from '@/components/CampaignCardsCarousel';

export default async function CampaignCardsSection() {
  const cards = await getActiveCampaignCards();

  if (!cards || cards.length === 0) {
    return null;
  }

  return <CampaignCardsCarousel initialCards={cards as any} />;
}
