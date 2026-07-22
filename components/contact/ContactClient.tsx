'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  HelpCircle,
  MessageCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';
import {
  ContactPagePayload,
  ContactDetail,
  ContactSubject,
  validateInternalOrExternalUrl,
} from '../../lib/contact-page';

export default function ContactClient() {
  const [data, setData] = useState<ContactPagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const fetchContactData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/contact-page');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load contact info.');
      setData(json.data);
      if (json.data?.subjects && json.data.subjects.length > 0) {
        setSubjectId(json.data.subjects[0].id);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load contact info.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setSubmitError('Please fill out all required fields.');
      return;
    }

    const selectedSubj = data?.subjects.find((s) => s.id === subjectId);
    const subjectLabel = selectedSubj ? selectedSubj.name : (subjectId.trim() || 'General Inquiry');

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact-inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          orderId,
          subjectId: selectedSubj ? subjectId : '',
          subjectLabel,
          message,
          website: honeypot,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to send message.');
      }

      setSubmittedRef(json.data?.inquiryRef || json.inquiryRef || 'INQ-SUCCESS');
      setName('');
      setEmail('');
      setPhone('');
      setOrderId('');
      setMessage('');
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while submitting your message.');
    } finally {
      setSubmitting(false);
    }
  };

  const settings = data?.settings;
  const details = data?.details || [];
  const subjects = data?.subjects || [];
  const map = data?.map;

  const renderIcon = (iconName: ContactDetail['icon']) => {
    switch (iconName) {
      case 'phone':
        return <Phone className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />;
      case 'mail':
        return <Mail className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />;
      case 'message-circle':
        return <MessageCircle className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />;
      case 'map-pin':
      default:
        return <MapPin className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src={settings?.heroImageUrl || 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=1920&q=80'}
          alt={settings?.heroImageAlt || 'Contact us background image'}
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            {settings?.heroTitle || 'CONTACT US'}
          </h1>
          {settings?.heroSubtitle && (
            <p className="text-neutral-200 text-xs sm:text-sm mt-1 font-light">{settings.heroSubtitle}</p>
          )}
        </div>
      </section>

      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">{settings?.breadcrumbLabel || 'Contact'}</span>
      </div>

      {loading && (
        <section className="max-w-7xl mx-auto pb-16">
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
            <span className="text-sm text-neutral-500">Loading contact information…</span>
          </div>
        </section>
      )}

      {!loading && fetchError && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="text-center py-12 bg-white rounded-md border border-neutral-200">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 mb-3">{fetchError}</p>
            <button
              onClick={fetchContactData}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-black text-white px-4 py-2 rounded-md hover:bg-neutral-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </section>
      )}

      {!loading && !fetchError && settings && !settings.pageActive && (
        <section className="max-w-3xl mx-auto pb-16">
          <div className="text-center py-16 bg-neutral-50 rounded-xl border border-neutral-200">
            <Mail className="w-8 h-8 text-neutral-400 mx-auto mb-3" />
            <h3 className="font-display text-lg font-bold text-neutral-900">Contact System Under Maintenance</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-sm mx-auto font-light">
              Our contact form is temporarily undergoing updates. Please check back shortly or visit our FAQ page.
            </p>
            <div className="mt-6">
              <Link href="/faq" className="inline-block bg-black text-white text-xs font-bold px-6 py-2.5 rounded-md hover:bg-neutral-800 transition">
                VISIT FAQ
              </Link>
            </div>
          </div>
        </section>
      )}

      {!loading && !fetchError && settings && settings.pageActive !== false && (
        <section className="pb-14 animate-fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            <div className="lg:col-span-3 bg-white border border-neutral-200 rounded-md p-6 sm:p-8 shadow-sm">
              <h2 className="font-display text-lg font-bold mb-1 text-neutral-900">
                {settings.formHeading || 'Send Us a Message'}
              </h2>
              {settings.formDescription && (
                <p className="text-neutral-500 text-xs mb-6 font-light">{settings.formDescription}</p>
              )}

              {submittedRef ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center animate-fade-up">
                  <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h3 className="font-display text-lg font-bold text-emerald-900">
                    {settings.successHeading || 'Thank You!'}
                  </h3>
                  <p className="text-xs font-mono font-bold text-emerald-800 mt-1">
                    Reference ID: <span className="underline">{submittedRef}</span>
                  </p>
                  <p className="text-xs text-emerald-700 mt-2 max-w-md mx-auto font-light leading-relaxed">
                    {settings.successMessage || "Your inquiry has been submitted successfully. We'll get back to you shortly."}
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setSubmittedRef(null)}
                      className="text-xs font-semibold bg-emerald-800 text-white px-5 py-2 rounded-md hover:bg-emerald-900 transition"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="hidden" aria-hidden="true">
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-600 block">
                      NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-600 block">
                      EMAIL <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-600 block">PHONE (OPTIONAL)</label>
                    <input
                      type="tel"
                      placeholder="+92 300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-neutral-600 block">ORDER ID (OPTIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. CR-100234"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      maxLength={50}
                      className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-neutral-600 block">
                      SUBJECT CATEGORY <span className="text-red-500">*</span>
                    </label>
                    {subjects.length > 0 ? (
                      <select
                        required
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                      >
                        {subjects.map((subj) => (
                          <option key={subj.id} value={subj.id}>{subj.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        required
                        type="text"
                        placeholder="How can we help?"
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                      />
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-neutral-600 block">
                      MESSAGE <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write your message details..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={3000}
                      className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition resize-none text-neutral-800"
                    />
                    <p className="text-[10px] text-neutral-400 mt-0.5 text-right">{message.length}/3000</p>
                  </div>

                  {submitError && (
                    <div className="sm:col-span-2 text-xs text-red-600 bg-red-50 p-3 rounded-md flex items-center gap-2 border border-red-200">
                      <AlertCircle className="w-4 h-4 flex-none" />
                      {submitError}
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto bg-black text-white text-sm font-semibold px-8 py-3 rounded-md hover:bg-neutral-800 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> SUBMITTING…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> {settings.submitButtonLabel || 'SEND MESSAGE'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              {settings.contactDetailsActive !== false && details.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm space-y-5">
                  {details.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      {renderIcon(item.icon)}
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{item.label}</p>
                        {item.href ? (
                          <a
                            href={item.href}
                            target={item.href.startsWith('http') ? '_blank' : undefined}
                            rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                            className="text-xs text-neutral-600 hover:text-black hover:underline mt-0.5 font-light block"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="text-xs text-neutral-500 mt-0.5 font-light">{item.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {settings.mapSectionActive !== false && map && map.active !== false && (
                <div className="bg-white border border-neutral-200 rounded-md overflow-hidden shadow-sm">
                  <div className="aspect-[16/10] bg-neutral-200 relative">
                    <Image
                      src={map.mapImageUrl || 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80'}
                      alt={map.mapImageAlt || 'Gulberg Lahore Map Location'}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center p-4">
                      <a
                        href={map.mapUrl || 'https://maps.google.com/?q=Gulberg+III+Lahore+Pakistan'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-black text-xs font-semibold px-4 py-2.5 rounded-md shadow hover:bg-neutral-100 transition active:scale-95 text-center uppercase"
                      >
                        {map.ctaLabel || 'FIND A STORE NEAR YOU'}
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {settings.faqCtaActive !== false && (
            <div className="mt-8 bg-white border border-neutral-200 rounded-md p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="font-display text-lg font-bold text-neutral-900">
                  {settings.faqHeading || 'Have a quick question?'}
                </p>
                <p className="text-neutral-500 text-xs sm:text-sm mt-1 font-light">
                  {settings.faqDescription || 'Check our FAQ — most answers are just a click away.'}
                </p>
              </div>
              <Link
                href={validateInternalOrExternalUrl(settings.faqButtonUrl) || '/faq'}
                className="border border-black text-sm font-semibold px-6 py-3 rounded-md hover:bg-black hover:text-white transition whitespace-nowrap active:scale-95"
              >
                {settings.faqButtonLabel || 'VISIT FAQ'}
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
