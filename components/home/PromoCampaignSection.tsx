import React from 'react';
import { getActivePromoCampaign } from '@/lib/server/homepage';
import PromoCampaignClient from './PromoCampaignClient';

export default async function PromoCampaignSection() {
  const { campaign, serverNow } = await getActivePromoCampaign();

  if (!campaign) {
    return null;
  }

  return <PromoCampaignClient campaign={campaign} serverNow={serverNow} />;
}
