'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Clock, Send, HelpCircle } from 'lucide-react';

export default function Contact() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setTimeout(() => {
      setFormSubmitted(false);
    }, 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-16">
      {/* PAGE HEADER BANNER */}
      <section className="relative h-40 sm:h-56 md:h-64 overflow-hidden -mx-4">
        <Image
          src="https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=1920&q=80"
          alt="Contact us background image"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col justify-center px-4">
          <h1 className="font-display text-white text-3xl sm:text-4xl font-extrabold tracking-tight">
            CONTACT US
          </h1>
          <p className="text-neutral-200 text-xs sm:text-sm mt-1 font-light">We&apos;d love to hear from you.</p>
        </div>
      </section>

      {/* BREADCRUMB */}
      <div className="py-4 text-xs sm:text-sm text-neutral-500">
        <Link href="/" className="hover:text-black">Home</Link> <span className="mx-1">/</span>{' '}
        <span className="text-neutral-900 font-medium">Contact</span>
      </div>

      {/* CONTACT LAYOUT */}
      <section className="pb-14 animate-fade-up">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* LEFT Form */}
          <div className="lg:col-span-3 bg-white border border-neutral-200 rounded-md p-6 sm:p-8 shadow-sm">
            <h2 className="font-display text-lg font-bold mb-1 text-neutral-900">Send Us a Message</h2>
            <p className="text-neutral-500 text-xs mb-6 font-light">Our team typically replies within 24 hours.</p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-600 block">NAME</label>
                <input
                  required
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-600 block">EMAIL</label>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-600 block">SUBJECT</label>
                <input
                  required
                  type="text"
                  placeholder="How can we help?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition text-neutral-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-600 block">MESSAGE</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full border border-neutral-300 rounded-md px-3 py-2.5 text-sm outline-none focus:border-black bg-[#f4f4f3] transition resize-none text-neutral-800"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-black text-white text-sm font-semibold px-8 py-3 rounded-md hover:bg-neutral-800 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> SEND MESSAGE
                </button>
                {formSubmitted && (
                  <p className="text-xs text-green-700 mt-3 font-semibold animate-pulse">
                    Thanks! Your message has been sent &mdash; we&apos;ll be in touch soon.
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* RIGHT Info Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-neutral-200 rounded-md p-6 shadow-sm space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Address</p>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">12-C, Gulberg III, Lahore, Punjab, Pakistan</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Phone</p>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">+92 300 1234567</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Email</p>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">support@colossalrigout.pk</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-neutral-800 flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Hours</p>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">Mon&ndash;Sat, 10:00 AM &ndash; 8:00 PM</p>
                </div>
              </div>
            </div>

            {/* Static map container */}
            <div className="bg-white border border-neutral-200 rounded-md overflow-hidden shadow-sm">
              <div className="aspect-[16/10] bg-neutral-200 relative">
                <Image
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80"
                  alt="Gulberg Lahore Map Mock"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Store locator is currently showing our Lahore flagship at Gulberg III!');
                    }}
                    className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-md shadow hover:bg-neutral-100 transition active:scale-95"
                  >
                    FIND A STORE NEAR YOU
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ TEASER */}
        <div className="mt-8 bg-white border border-neutral-200 rounded-md p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <p className="font-display text-lg font-bold text-neutral-900">Have a quick question?</p>
            <p className="text-neutral-500 text-xs sm:text-sm mt-1 font-light">
              Check our FAQ &mdash; most answers are just a click away.
            </p>
          </div>
          <Link
            href="/faq"
            className="border border-black text-sm font-semibold px-6 py-3 rounded-md hover:bg-black hover:text-white transition whitespace-nowrap active:scale-95"
          >
            VISIT FAQ
          </Link>
        </div>
      </section>
    </div>
  );
}
