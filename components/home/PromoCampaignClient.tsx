'use client';

import React from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/components/ui/ImageWithFallback';
import type { HomepageCampaign } from '@/lib/server/homepage';

interface Props {
  campaign: HomepageCampaign;
  serverNow: string;
  compact?: boolean;
}

export default function PromoCampaignClient({ campaign, serverNow, compact = false }: Props) {
  const [serverOffset, setServerOffset] = React.useState(0);
  const [countdown, setCountdown] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = React.useState(false);

  React.useEffect(() => {
    const serverMs = new Date(serverNow).getTime();
    const clientMs = Date.now();
    setServerOffset(serverMs - clientMs);
  }, [serverNow]);

  React.useEffect(() => {
    if (!campaign?.endsAt) return;
    const endMs = new Date(campaign.endsAt).getTime();

    const tick = () => {
      const nowSynced = Date.now() + serverOffset;
      const remaining = endMs - nowSynced;
      if (remaining <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setExpired(true);
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      setCountdown({
        days: Math.floor(totalSecs / 86400),
        hours: Math.floor((totalSecs % 86400) / 3600),
        minutes: Math.floor((totalSecs % 3600) / 60),
        seconds: totalSecs % 60,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [campaign, serverOffset]);

  if (expired) return null;

  return (
    <section className={`w-full bg-[#111110] text-white overflow-hidden relative ${compact ? 'py-6 sm:py-8 my-0 rounded-2xl' : 'py-12 sm:py-16 my-8'}`}>
      {/* Dynamic background image */}
      <div
        className="absolute inset-0"
        style={{ opacity: campaign.backgroundOverlayOpacity ? 1 - campaign.backgroundOverlayOpacity : 0.45 }}
      >
        <ImageWithFallback
          src={campaign.backgroundImageUrl}
          alt={campaign.heading || "Promotion Background"}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />

      <div
        className={`max-w-7xl mx-auto px-4 relative flex flex-col md:flex-row items-center justify-between gap-8 ${
          campaign.textAlignment === 'center' ? 'md:justify-center text-center' : ''
        }`}
      >
        <div
          className={`space-y-3 max-w-xl ${
            campaign.textAlignment === 'center' ? 'text-center' : 'text-center md:text-left'
          }`}
        >
          {campaign.badgeText && (
            <span className="inline-block bg-amber-500 text-black font-display font-black text-[10px] tracking-widest px-3 py-1 rounded uppercase">
              {campaign.badgeText}
            </span>
          )}
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
            {campaign.heading}
          </h2>
          {campaign.description && (
            <p className="text-neutral-300 text-sm sm:text-base font-medium">
              {campaign.highlightText && (
                <span className="text-amber-400 font-bold">{campaign.highlightText} </span>
              )}
              {campaign.description}
              {campaign.discountMode === 'coupon' && campaign.couponCode && (
                <>
                  {' '}Use code{' '}
                  <span className="font-mono bg-white/10 text-white px-2 py-0.5 rounded text-xs font-semibold">
                    {campaign.couponCode}
                  </span>{' '}
                  at checkout.
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-5 shrink-0 bg-white/5 border border-white/10 backdrop-blur-md p-6 sm:p-8 rounded-2xl w-full max-w-sm">
          <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase text-center">
            Offer Ends In
          </p>

          <div className={`grid gap-4 text-center ${countdown.days > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {countdown.days > 0 && (
              <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
                <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                  {String(countdown.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                  Days
                </span>
              </div>
            )}
            <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {String(countdown.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                Hours
              </span>
            </div>
            <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {String(countdown.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                Mins
              </span>
            </div>
            <div className="flex flex-col items-center min-w-[60px] bg-black/45 p-3 rounded-xl border border-white/5">
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-400">
                {String(countdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                Secs
              </span>
            </div>
          </div>

          <Link
            href={`/shop?campaign=${campaign.id}`}
            className="w-full bg-white hover:bg-neutral-100 text-black text-center text-xs font-bold py-3 px-6 rounded-lg transition uppercase tracking-wider active:scale-[0.98] cursor-pointer shadow-md"
          >
            {campaign.ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
