'use client';

import React, { useState, useEffect } from 'react';
import { adminApiFetch } from '@/lib/admin-api';
import {
  AnnouncementSettings,
  NewsletterSettings,
  FooterSettings,
  FooterSocialLink,
  FooterPillar,
  DEFAULT_ANNOUNCEMENT_SETTINGS,
  DEFAULT_NEWSLETTER_SETTINGS,
  DEFAULT_FOOTER_SETTINGS,
  interpolateNewsletterMessage,
  normalizeCouponCode,
  isValidUrlOrPath,
} from '@/lib/storefront-settings';
import {
  ShopBannerSettings,
  DEFAULT_SHOP_BANNER_SETTINGS,
} from '@/lib/shop-page-settings';
import {
  Megaphone,
  Mail,
  Layout,
  Columns,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  HelpCircle,
  Sparkles,
  Smartphone,
  Monitor,
  RefreshCw,
  ImageIcon,
  Upload,
} from 'lucide-react';

type SectionTab = 'announcement' | 'newsletter' | 'footer-company' | 'footer-pillars' | 'shop-banner';

async function optimizeShopBannerImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Please select a JPEG, PNG, or WebP image.');
  }
  const source = await createImageBitmap(file);
  const maxWidth = 1600;
  const maxHeight = 650;
  const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    source.close();
    throw new Error('Unable to optimize banner image.');
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  const dataUrl = canvas.toDataURL('image/webp', 0.78);
  const base64Payload = dataUrl.split(',')[1] || '';
  const decodedBytes = Math.floor((base64Payload.length * 3) / 4);
  if (decodedBytes > 750_000) {
    throw new Error('Optimized banner image is too large. Please choose a smaller image.');
  }
  return dataUrl;
}

export default function StorefrontContentModule() {
  const [activeTab, setActiveTab] = useState<SectionTab>('announcement');
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset confirmation modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Form states
  const [announcement, setAnnouncement] = useState<AnnouncementSettings>(DEFAULT_ANNOUNCEMENT_SETTINGS);
  const [newsletter, setNewsletter] = useState<NewsletterSettings>(DEFAULT_NEWSLETTER_SETTINGS);
  const [footer, setFooter] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [shopBanner, setShopBanner] = useState<ShopBannerSettings>(DEFAULT_SHOP_BANNER_SETTINGS);

  // Original states to track dirty status
  const [origAnnouncement, setOrigAnnouncement] = useState<AnnouncementSettings>(DEFAULT_ANNOUNCEMENT_SETTINGS);
  const [origNewsletter, setOrigNewsletter] = useState<NewsletterSettings>(DEFAULT_NEWSLETTER_SETTINGS);
  const [origFooter, setOrigFooter] = useState<FooterSettings>(DEFAULT_FOOTER_SETTINGS);
  const [origShopBanner, setOrigShopBanner] = useState<ShopBannerSettings>(DEFAULT_SHOP_BANNER_SETTINGS);

  // Shop banner image upload state
  const [shopBannerImageFile, setShopBannerImageFile] = useState<File | null>(null);
  const [shopBannerImagePreview, setShopBannerImagePreview] = useState<string>('');
  const [hasCustomShopBannerImage, setHasCustomShopBannerImage] = useState(false);

  // Coupon check state
  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [couponStatus, setCouponStatus] = useState<'checking' | 'active' | 'not_found' | 'inactive'>('checking');

  // Preview viewport state for announcement & footer preview
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Interactive newsletter preview input
  const [newsletterPreviewSubmitted, setNewsletterPreviewSubmitted] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPromotions();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const [sfRes, shopRes] = await Promise.all([
        adminApiFetch('/api/admin/storefront-settings'),
        adminApiFetch('/api/admin/shop-page-settings'),
      ]);

      const json = await sfRes.json();
      if (json.success && json.data) {
        if (json.data.announcement) {
          setAnnouncement(json.data.announcement);
          setOrigAnnouncement(json.data.announcement);
        }
        if (json.data.newsletter) {
          setNewsletter(json.data.newsletter);
          setOrigNewsletter(json.data.newsletter);
        }
        if (json.data.footer) {
          setFooter(json.data.footer);
          setOrigFooter(json.data.footer);
        }
      }

      const shopJson = await shopRes.json();
      if (shopJson.success && shopJson.data) {
        if (shopJson.data.banner) {
          setShopBanner(shopJson.data.banner);
          setOrigShopBanner(shopJson.data.banner);
        }
        setHasCustomShopBannerImage(Boolean(shopJson.data.hasCustomImage));
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error connecting to admin settings server.' });
    } finally {
      setLoading(false);
    }
  };

  const loadPromotions = async () => {
    try {
      const res = await adminApiFetch('/api/promotions');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPromotionsList(json.data);
      }
    } catch {
      // Non-blocking
    }
  };

  // Check coupon validity against loaded promotions
  useEffect(() => {
    if (!newsletter.couponCode || newsletter.discountType === 'none') {
      setCouponStatus('not_found');
      return;
    }
    const code = normalizeCouponCode(newsletter.couponCode);
    const match = promotionsList.find((p: any) => String(p.code || p.couponCode).toUpperCase() === code);
    if (!match) {
      setCouponStatus('not_found');
    } else if (match.active === false || match.status === 'inactive' || match.status === 'expired') {
      setCouponStatus('inactive');
    } else {
      setCouponStatus('active');
    }
  }, [newsletter.couponCode, newsletter.discountType, promotionsList]);

  // Save handler for storefront content sections
  const handleSaveSection = async (secKey: 'announcement' | 'newsletter' | 'footer') => {
    setSavingSection(secKey);
    setStatusMessage(null);
    setValidationErrors({});

    let payloadData: any = null;
    if (secKey === 'announcement') payloadData = announcement;
    else if (secKey === 'newsletter') payloadData = newsletter;
    else if (secKey === 'footer') payloadData = footer;

    try {
      const res = await adminApiFetch('/api/admin/storefront-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: secKey, data: payloadData }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setStatusMessage({ type: 'success', text: json.message || 'Settings saved successfully!' });
        if (secKey === 'announcement') {
          setAnnouncement(json.data);
          setOrigAnnouncement(json.data);
        } else if (secKey === 'newsletter') {
          setNewsletter(json.data);
          setOrigNewsletter(json.data);
        } else if (secKey === 'footer') {
          setFooter(json.data);
          setOrigFooter(json.data);
        }
      } else {
        if (json.errors) setValidationErrors(json.errors);
        setStatusMessage({ type: 'error', text: json.message || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error saving storefront settings.' });
    } finally {
      setSavingSection(null);
    }
  };

  // Save handler for Shop Banner section
  const handleSaveShopBanner = async (resetImg = false) => {
    setSavingSection('shop-banner');
    setStatusMessage(null);
    setValidationErrors({});

    try {
      let imageDataUrl: string | null = null;
      if (shopBannerImageFile && !resetImg) {
        imageDataUrl = shopBannerImagePreview || await optimizeShopBannerImage(shopBannerImageFile);
      }

      const res = await adminApiFetch('/api/admin/shop-page-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: shopBanner,
          imageDataUrl,
          resetImage: resetImg,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setStatusMessage({ type: 'success', text: json.message || 'Shop Page Banner settings saved!' });
        setShopBanner(json.data);
        setOrigShopBanner(json.data);
        setShopBannerImageFile(null);
        setShopBannerImagePreview('');
        if (resetImg) {
          setHasCustomShopBannerImage(false);
        } else if (imageDataUrl) {
          setHasCustomShopBannerImage(true);
        }
      } else {
        if (json.errors) setValidationErrors(json.errors);
        setStatusMessage({ type: 'error', text: json.message || 'Failed to save Shop Page Banner.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error saving Shop Page Banner.' });
    } finally {
      setSavingSection(null);
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    setStatusMessage(null);
    try {
      const res = await adminApiFetch('/api/admin/storefront-settings/seed?reset=true', {
        method: 'POST',
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: 'Storefront content reset to default values.' });
        setShowResetModal(false);
        await loadSettings();
      } else {
        setStatusMessage({ type: 'error', text: json.message || 'Reset failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Error during reset.' });
    } finally {
      setResetting(false);
    }
  };

  // Reordering helpers for social links
  const moveSocial = (index: number, direction: 'up' | 'down') => {
    const list = [...footer.socialLinks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setFooter({ ...footer, socialLinks: updated });
  };

  const addSocial = () => {
    if (footer.socialLinks.length >= 8) return;
    const newLink: FooterSocialLink = {
      id: `social-${Date.now()}`,
      platform: 'custom',
      label: 'LINK',
      url: 'https://',
      enabled: true,
      order: footer.socialLinks.length + 1,
    };
    setFooter({ ...footer, socialLinks: [...footer.socialLinks, newLink] });
  };

  const removeSocial = (id: string) => {
    const updated = footer.socialLinks
      .filter((s) => s.id !== id)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    setFooter({ ...footer, socialLinks: updated });
  };

  // Reordering helpers for pillars
  const movePillar = (index: number, direction: 'up' | 'down') => {
    const list = [...footer.pillars];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    setFooter({ ...footer, pillars: updated });
  };

  const addPillar = () => {
    if (footer.pillars.length >= 6) return;
    const newPillar: FooterPillar = {
      id: `pillar-${Date.now()}`,
      title: 'NEW PILLAR',
      description: 'Pillar description goes here.',
      enabled: true,
      order: footer.pillars.length + 1,
    };
    setFooter({ ...footer, pillars: [...footer.pillars, newPillar] });
  };

  const removePillar = (id: string) => {
    const updated = footer.pillars
      .filter((p) => p.id !== id)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    setFooter({ ...footer, pillars: updated });
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatusMessage({ type: 'error', text: 'Please select a valid image file (JPG, PNG, or WebP).' });
      return;
    }

    try {
      setStatusMessage(null);
      const optimizedPreview = await optimizeShopBannerImage(file);
      setShopBannerImageFile(file);
      setShopBannerImagePreview(optimizedPreview);
    } catch (error: any) {
      setShopBannerImageFile(null);
      setShopBannerImagePreview('');
      setStatusMessage({ type: 'error', text: error?.message || 'Unable to prepare banner image.' });
      e.target.value = '';
    }
  };

  const isAnnouncementDirty = JSON.stringify(announcement) !== JSON.stringify(origAnnouncement);
  const isNewsletterDirty = JSON.stringify(newsletter) !== JSON.stringify(origNewsletter);
  const isFooterDirty = JSON.stringify(footer) !== JSON.stringify(origFooter);
  const isShopBannerDirty = JSON.stringify(shopBanner) !== JSON.stringify(origShopBanner) || Boolean(shopBannerImageFile);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-neutral-500 mx-auto mb-3" />
        <p className="text-neutral-600 text-sm font-medium">Loading Storefront Content Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 font-display flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-black" /> Storefront Content Management
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Manage top announcement bar, homepage newsletter discount, footer brand info, pillars, and shop page banner.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-semibold underline hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Sub-Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-1.5 flex flex-wrap gap-1">
        <button
          onClick={() => { setActiveTab('announcement'); setStatusMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'announcement'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Megaphone className="w-4 h-4" /> Announcement Bar
          {isAnnouncementDirty && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('newsletter'); setStatusMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'newsletter'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Mail className="w-4 h-4" /> Newsletter Discount
          {isNewsletterDirty && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('footer-company'); setStatusMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'footer-company'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Layout className="w-4 h-4" /> Footer Company &amp; Socials
          {isFooterDirty && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('footer-pillars'); setStatusMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'footer-pillars'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <Columns className="w-4 h-4" /> Footer Pillars
          {isFooterDirty && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>

        <button
          onClick={() => { setActiveTab('shop-banner'); setStatusMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'shop-banner'
              ? 'bg-black text-white shadow-sm'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Shop Page Banner
          {isShopBannerDirty && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
        </button>
      </div>

      {/* ────────────────── 1. ANNOUNCEMENT BAR TAB ────────────────── */}
      {activeTab === 'announcement' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-neutral-700" /> Announcement Settings
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-neutral-600">
                  {announcement.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={announcement.enabled}
                  onChange={(e) => setAnnouncement({ ...announcement, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Primary Message <span className="text-red-500">*</span> (max 140 chars)
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  placeholder="FREE SHIPPING ON ORDERS OVER PKR 5,000"
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition ${
                    validationErrors.message ? 'border-red-400 bg-red-50/50' : 'border-neutral-300'
                  }`}
                />
                {validationErrors.message && (
                  <p className="text-red-500 text-[11px] mt-1">{validationErrors.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Secondary Message (optional, max 100 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={announcement.secondaryMessage}
                    onChange={(e) => setAnnouncement({ ...announcement, secondaryMessage: e.target.value })}
                    placeholder="EASY RETURNS"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Separator (max 5 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={announcement.separator}
                    onChange={(e) => setAnnouncement({ ...announcement, separator: e.target.value })}
                    placeholder="|"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Link Label (optional, max 40 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={announcement.linkLabel}
                    onChange={(e) => setAnnouncement({ ...announcement, linkLabel: e.target.value })}
                    placeholder="Shop Sale Now"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Link URL (e.g. /shop?cat=sale or https://...)
                  </label>
                  <input
                    type="text"
                    value={announcement.linkHref}
                    onChange={(e) => setAnnouncement({ ...announcement, linkHref: e.target.value })}
                    placeholder="/shop?cat=sale"
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition ${
                      validationErrors.linkHref ? 'border-red-400 bg-red-50/50' : 'border-neutral-300'
                    }`}
                  />
                  {validationErrors.linkHref && (
                    <p className="text-red-500 text-[11px] mt-1">{validationErrors.linkHref}</p>
                  )}
                </div>
              </div>

              {announcement.linkHref && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="openInNewTab"
                    checked={announcement.openInNewTab}
                    onChange={(e) => setAnnouncement({ ...announcement, openInNewTab: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                  />
                  <label htmlFor="openInNewTab" className="font-medium text-neutral-700 cursor-pointer">
                    Open link in new browser tab
                  </label>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {isAnnouncementDirty ? 'Unsaved changes pending' : 'All changes saved'}
              </span>
              <button
                disabled={savingSection === 'announcement'}
                onClick={() => handleSaveSection('announcement')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {savingSection === 'announcement' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Announcement
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-neutral-600" /> Live Bar Preview
                </h4>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-[11px]">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2 py-1 rounded font-medium flex items-center gap-1 ${
                      previewDevice === 'desktop' ? 'bg-white shadow text-black' : 'text-neutral-500'
                    }`}
                  >
                    <Monitor className="w-3 h-3" /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2 py-1 rounded font-medium flex items-center gap-1 ${
                      previewDevice === 'mobile' ? 'bg-white shadow text-black' : 'text-neutral-500'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> Mobile
                  </button>
                </div>
              </div>

              <div className="border border-neutral-300 rounded-lg overflow-hidden bg-neutral-100">
                {!announcement.enabled ? (
                  <div className="p-6 text-center text-xs text-neutral-500 italic bg-neutral-50">
                    (Announcement bar is currently disabled and will not render on storefront)
                  </div>
                ) : (
                  <div
                    className={`bg-black text-white text-[11px] sm:text-xs transition-all ${
                      previewDevice === 'mobile' ? 'max-w-[320px] mx-auto border-x border-neutral-700' : 'w-full'
                    }`}
                  >
                    <div className="max-w-7xl mx-auto flex items-center justify-between px-3 py-2">
                      <span className="hidden sm:block"></span>
                      <p className="mx-auto tracking-wide font-normal text-center truncate">
                        {announcement.message}
                        {announcement.secondaryMessage && (
                          <span>
                            &nbsp;{announcement.separator || '|'}&nbsp;{announcement.secondaryMessage}
                          </span>
                        )}
                        {announcement.linkLabel && (
                          <span className="ml-2 font-semibold underline underline-offset-2">
                            {announcement.linkLabel}
                          </span>
                        )}
                      </p>
                      <div className="hidden sm:flex items-center gap-3 whitespace-nowrap text-neutral-300 text-[10px]">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Store</span>
                        <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Help</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 2. NEWSLETTER DISCOUNT TAB ────────────────── */}
      {activeTab === 'newsletter' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-neutral-700" /> Newsletter Discount Settings
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-neutral-600">
                  {newsletter.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={newsletter.enabled}
                  onChange={(e) => setNewsletter({ ...newsletter, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Eyebrow Text (optional)
                  </label>
                  <input
                    type="text"
                    value={newsletter.eyebrow}
                    onChange={(e) => setNewsletter({ ...newsletter, eyebrow: e.target.value })}
                    placeholder="SPECIAL OFFER"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Main Heading <span className="text-red-500">*</span> (max 100 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={newsletter.heading}
                    onChange={(e) => setNewsletter({ ...newsletter, heading: e.target.value })}
                    placeholder="GET 10% OFF YOUR FIRST ORDER"
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition ${
                      validationErrors.heading ? 'border-red-400 bg-red-50/50' : 'border-neutral-300'
                    }`}
                  />
                  {validationErrors.heading && (
                    <p className="text-red-500 text-[11px] mt-1">{validationErrors.heading}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Description Text (max 240 chars)
                </label>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={newsletter.description}
                  onChange={(e) => setNewsletter({ ...newsletter, description: e.target.value })}
                  placeholder="Subscribe to our newsletter for exclusive offers and new arrivals."
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition resize-none"
                />
              </div>

              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
                <h4 className="font-semibold text-neutral-800 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" /> Promotion &amp; Coupon Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Discount Type</label>
                    <select
                      value={newsletter.discountType}
                      onChange={(e: any) => setNewsletter({ ...newsletter, discountType: e.target.value })}
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white focus:border-black outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (PKR)</option>
                      <option value="none">None / Information Only</option>
                    </select>
                  </div>
                  {newsletter.discountType !== 'none' && (
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">
                        Value ({newsletter.discountType === 'percentage' ? '%' : 'PKR'})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={newsletter.discountType === 'percentage' ? 100 : 100000}
                        value={newsletter.discountValue}
                        onChange={(e) => setNewsletter({ ...newsletter, discountValue: Number(e.target.value) })}
                        className={`w-full border rounded-lg px-3 py-2 text-xs bg-white focus:border-black outline-none ${
                          validationErrors.discountValue ? 'border-red-400 bg-red-50/50' : 'border-neutral-300'
                        }`}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Coupon Code</label>
                    <input
                      type="text"
                      value={newsletter.couponCode}
                      onChange={(e) => setNewsletter({ ...newsletter, couponCode: normalizeCouponCode(e.target.value) })}
                      placeholder="WELCOME10"
                      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white uppercase tracking-wider focus:border-black outline-none font-mono"
                    />
                  </div>
                </div>

                {newsletter.couponCode && newsletter.discountType !== 'none' && (
                  <div className="flex items-center gap-2 text-[11px] pt-1">
                    {couponStatus === 'active' ? (
                      <span className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-100 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Coupon code `{newsletter.couponCode}` exists &amp; active in Promotions
                      </span>
                    ) : couponStatus === 'inactive' ? (
                      <span className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-100 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5" /> Promotion `{newsletter.couponCode}` is currently INACTIVE in Promotions module
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-neutral-600 font-medium bg-neutral-200 px-2.5 py-1 rounded-md">
                        <Info className="w-3.5 h-3.5" /> Promotion `{newsletter.couponCode}` not found in Promotions database. (Displays code on storefront)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Input Placeholder</label>
                  <input
                    type="text"
                    value={newsletter.inputPlaceholder}
                    onChange={(e) => setNewsletter({ ...newsletter, inputPlaceholder: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Button Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={newsletter.buttonLabel}
                    onChange={(e) => setNewsletter({ ...newsletter, buttonLabel: e.target.value })}
                    placeholder="SUBSCRIBE"
                    className={`w-full border rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition ${
                      validationErrors.buttonLabel ? 'border-red-400 bg-red-50/50' : 'border-neutral-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Success Message Template (max 240 chars)
                </label>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={newsletter.successMessage}
                  onChange={(e) => setNewsletter({ ...newsletter, successMessage: e.target.value })}
                  placeholder="Thanks for subscribing! Use {{couponCode}} for {{discountLabel}}."
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition resize-none font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {isNewsletterDirty ? 'Unsaved changes pending' : 'All changes saved'}
              </span>
              <button
                disabled={savingSection === 'newsletter'}
                onClick={() => handleSaveSection('newsletter')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {savingSection === 'newsletter' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Newsletter Content
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200 space-y-4">
              <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5 pb-3 border-b border-neutral-100">
                <Sparkles className="w-4 h-4 text-purple-600" /> Form Preview
              </h4>
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-[#f4efe9] p-6 text-center">
                {!newsletter.enabled ? (
                  <p className="text-xs text-neutral-500 italic">
                    (Newsletter section is disabled and will be hidden from homepage)
                  </p>
                ) : (
                  <div className="max-w-md mx-auto space-y-3">
                    {newsletter.eyebrow && (
                      <p className="text-[10px] font-bold tracking-widest text-purple-700 uppercase">
                        {newsletter.eyebrow}
                      </p>
                    )}
                    <h3 className="font-display text-xl sm:text-2xl font-bold flex items-center justify-center gap-2 text-neutral-900 leading-snug">
                      {newsletter.heading || 'GET 10% OFF YOUR FIRST ORDER'}
                    </h3>
                    <p className="text-neutral-600 text-xs font-light">
                      {newsletter.description || 'Subscribe to our newsletter for exclusive offers.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 3. FOOTER COMPANY & SOCIALS TAB ────────────────── */}
      {activeTab === 'footer-company' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-5">
            <div className="pb-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <Layout className="w-5 h-5 text-neutral-700" /> Footer Brand &amp; Social Links
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Brand Main Title (max 60 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={footer.brandName}
                    onChange={(e) => setFooter({ ...footer, brandName: e.target.value })}
                    placeholder="Colossal"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Brand Accent Title (max 60 chars)
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={footer.brandAccentText}
                    onChange={(e) => setFooter({ ...footer, brandAccentText: e.target.value })}
                    placeholder="Rigout"
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Brand Description (max 300 chars)
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={footer.brandDescription}
                  onChange={(e) => setFooter({ ...footer, brandDescription: e.target.value })}
                  placeholder="Trendy pieces, timeless style..."
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Website Copyright Domain Label
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={footer.websiteLabel}
                  onChange={(e) => setFooter({ ...footer, websiteLabel: e.target.value })}
                  placeholder="colossalrigout.pk"
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-800 text-xs">
                    Social Links (max 8)
                  </h4>
                  <button
                    type="button"
                    onClick={addSocial}
                    disabled={footer.socialLinks.length >= 8}
                    className="flex items-center gap-1 text-[11px] font-semibold text-black hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Social Link
                  </button>
                </div>

                <div className="space-y-3">
                  {footer.socialLinks.map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSocial(idx, 'up')}
                          className="p-1 text-neutral-500 hover:text-black disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === footer.socialLinks.length - 1}
                          onClick={() => moveSocial(idx, 'down')}
                          className="p-1 text-neutral-500 hover:text-black disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 w-full">
                        <select
                          value={s.platform}
                          onChange={(e: any) => {
                            const updated = [...footer.socialLinks];
                            updated[idx].platform = e.target.value;
                            setFooter({ ...footer, socialLinks: updated });
                          }}
                          className="border border-neutral-300 rounded-lg px-2 py-1.5 text-xs bg-white"
                        >
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                          <option value="x">X (Twitter)</option>
                          <option value="custom">Custom</option>
                        </select>
                        <input
                          type="text"
                          maxLength={10}
                          value={s.label}
                          onChange={(e) => {
                            const updated = [...footer.socialLinks];
                            updated[idx].label = e.target.value;
                            setFooter({ ...footer, socialLinks: updated });
                          }}
                          placeholder="Label (IG)"
                          className="border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={s.url}
                          onChange={(e) => {
                            const updated = [...footer.socialLinks];
                            updated[idx].url = e.target.value;
                            setFooter({ ...footer, socialLinks: updated });
                          }}
                          placeholder="https://..."
                          className="col-span-2 sm:col-span-2 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSocial(s.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {isFooterDirty ? 'Unsaved changes pending' : 'All changes saved'}
              </span>
              <button
                disabled={savingSection === 'footer'}
                onClick={() => handleSaveSection('footer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {savingSection === 'footer' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Footer Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 4. FOOTER PILLARS TAB ────────────────── */}
      {activeTab === 'footer-pillars' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <Columns className="w-5 h-5 text-neutral-700" /> Trust / Promotional Pillars (max 6)
              </h3>
              <button
                type="button"
                onClick={addPillar}
                disabled={footer.pillars.length >= 6}
                className="flex items-center gap-1 text-xs font-semibold text-black hover:underline disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Pillar
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {footer.pillars.map((p, idx) => (
                <div key={p.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePillar(idx, 'up')}
                        className="p-1 text-neutral-500 hover:text-black disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === footer.pillars.length - 1}
                        onClick={() => movePillar(idx, 'down')}
                        className="p-1 text-neutral-500 hover:text-black disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-neutral-700 text-xs">Pillar #{idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={(e) => {
                            const updated = [...footer.pillars];
                            updated[idx].enabled = e.target.checked;
                            setFooter({ ...footer, pillars: updated });
                          }}
                          className="w-3.5 h-3.5 rounded text-black focus:ring-black cursor-pointer"
                        />
                        <span className="text-xs font-medium text-neutral-700">Enabled</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removePillar(p.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Title (max 60 chars)</label>
                      <input
                        type="text"
                        maxLength={60}
                        value={p.title}
                        onChange={(e) => {
                          const updated = [...footer.pillars];
                          updated[idx].title = e.target.value;
                          setFooter({ ...footer, pillars: updated });
                        }}
                        placeholder="SUSTAINABLE MATERIALS"
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Description (max 160 chars)</label>
                      <input
                        type="text"
                        maxLength={160}
                        value={p.description}
                        onChange={(e) => {
                          const updated = [...footer.pillars];
                          updated[idx].description = e.target.value;
                          setFooter({ ...footer, pillars: updated });
                        }}
                        placeholder="Better for you. Better for the planet."
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {isFooterDirty ? 'Unsaved changes pending' : 'All changes saved'}
              </span>
              <button
                disabled={savingSection === 'footer'}
                onClick={() => handleSaveSection('footer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {savingSection === 'footer' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Footer Pillars
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 5. SHOP PAGE BANNER TAB ────────────────── */}
      {activeTab === 'shop-banner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form */}
          <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-neutral-700" /> Shop Banner Settings
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-neutral-600">
                  {shopBanner.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <input
                  type="checkbox"
                  checked={shopBanner.enabled}
                  onChange={(e) => setShopBanner({ ...shopBanner, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Banner Background Image (Optimized to WebP max 1600x650)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 border border-neutral-300 rounded-lg font-semibold bg-white hover:bg-neutral-50 transition cursor-pointer">
                    <Upload className="w-4 h-4 text-neutral-600" /> Choose Image File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBannerFileSelect}
                      className="hidden"
                    />
                  </label>
                  {shopBannerImageFile && (
                    <span className="text-[11px] text-emerald-600 font-semibold truncate">
                      ✓ Selected: {shopBannerImageFile.name}
                    </span>
                  )}
                  {hasCustomShopBannerImage && !shopBannerImageFile && (
                    <button
                      type="button"
                      onClick={() => handleSaveShopBanner(true)}
                      className="text-red-500 hover:text-red-700 font-semibold text-[11px] underline cursor-pointer"
                    >
                      Remove Custom Banner Image
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Image Accessibility Alt Text (max 160 chars)
                </label>
                <input
                  type="text"
                  maxLength={160}
                  value={shopBanner.imageAlt}
                  onChange={(e) => setShopBanner({ ...shopBanner, imageAlt: e.target.value })}
                  placeholder="Colossal Rigout shop collection"
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-black transition ${
                    validationErrors.imageAlt ? 'border-red-400 bg-red-50/50' : 'border-neutral-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Image Alignment / Focal Point
                  </label>
                  <select
                    value={shopBanner.imagePosition}
                    onChange={(e: any) => setShopBanner({ ...shopBanner, imagePosition: e.target.value })}
                    className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-xs bg-white focus:border-black outline-none"
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Dark Overlay Opacity ({Math.round(shopBanner.overlayOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="0.85"
                    step="0.05"
                    value={shopBanner.overlayOpacity}
                    onChange={(e) => setShopBanner({ ...shopBanner, overlayOpacity: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                    <span>20% (Lighter)</span>
                    <span>85% (Darker)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                {isShopBannerDirty ? 'Unsaved changes pending' : 'All changes saved'}
              </span>
              <button
                disabled={savingSection === 'shop-banner'}
                onClick={() => handleSaveShopBanner(false)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-black text-white hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {savingSection === 'shop-banner' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Shop Banner
              </button>
            </div>
          </div>

          {/* Banner Live Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-neutral-200 space-y-4">
              <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-1.5 pb-3 border-b border-neutral-100">
                <ImageIcon className="w-4 h-4 text-neutral-600" /> Banner Live Preview
              </h4>

              <div className="relative bg-black text-white rounded-xl overflow-hidden min-h-[160px] flex items-center justify-center p-6 text-center border border-neutral-300">
                {shopBannerImagePreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={shopBannerImagePreview}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    style={{ objectPosition: shopBanner.imagePosition }}
                  />
                ) : hasCustomShopBannerImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/api/shop-banner-image"
                    alt="Current Banner"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    style={{ objectPosition: shopBanner.imagePosition }}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/colossal-rigout-logo.png"
                    alt="Fallback Logo Banner"
                    className="absolute inset-0 w-full h-full object-contain p-8 opacity-25 z-0"
                  />
                )}

                <div
                  className="absolute inset-0 bg-black z-10"
                  style={{ opacity: shopBanner.overlayOpacity }}
                />

                <div className="relative z-20 space-y-1">
                  <h3 className="font-display text-xl font-extrabold uppercase tracking-tight text-white">
                    ALL PRODUCTS
                  </h3>
                  <p className="text-[10px] tracking-widest text-neutral-300 uppercase font-semibold">
                    24 PRODUCTS AVAILABLE
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-neutral-200">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-neutral-900">Reset Content to Defaults?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              This will overwrite all storefront content settings in Firestore with the original default configuration. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={handleResetDefaults}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {resetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Yes, Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
