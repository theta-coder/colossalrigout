'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, ShoppingBag, Mail, Volume2, VolumeX, Check, CheckCheck, X } from 'lucide-react';
import { AdminNotificationItem } from '@/app/api/admin/notifications/route';

interface AdminNotificationBellProps {
  onNavigate: (tab: 'orders' | 'contact-inquiries') => void;
}

export default function AdminNotificationBell({ onNavigate }: AdminNotificationBellProps) {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'orders' | 'inquiries'>('all');
  const [isRinging, setIsRinging] = useState(false);

  const initialLoadDoneRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Load Sound Preference & Read State from localStorage
  useEffect(() => {
    try {
      const savedSound = localStorage.getItem('cr_admin_sound_enabled');
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }

      const savedRead = localStorage.getItem('cr_admin_read_notifs');
      if (savedRead) {
        const parsed = JSON.parse(savedRead);
        if (Array.isArray(parsed)) {
          setReadIds(new Set(parsed));
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // Save Read IDs to localStorage
  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      try {
        localStorage.setItem('cr_admin_read_notifs', JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('cr_admin_read_notifs', JSON.stringify(Array.from(allIds)));
    } catch {}
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cr_admin_sound_enabled', String(next));
      } catch {}
      if (next) {
        playNotificationChime();
      }
      return next;
    });
  };

  // 2. Audio Chime (Web Audio Synthesizer)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Tone 1: High E6 (1318.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.5, ctx.currentTime);
      gain1.gain.setValueAtTime(0.18, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);

      // Tone 2: Higher A6 (1760 Hz) slightly delayed
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1760, ctx.currentTime);
          gain2.gain.setValueAtTime(0.22, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.45);
        } catch {}
      }, 100);
    } catch {
      // Audio context policy fallback
    }
  };

  // 3. Fetch Notifications & Detect New Items
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        headers: {
          'X-Admin-Session': '1',
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.notifications) return;

      const fetchedList: AdminNotificationItem[] = json.data.notifications;
      setNotifications(fetchedList);

      const currentIds = new Set(fetchedList.map((n) => n.id));

      if (initialLoadDoneRef.current) {
        // Find if there are brand new items
        let hasBrandNew = false;
        fetchedList.forEach((n) => {
          if (!knownIdsRef.current.has(n.id)) {
            hasBrandNew = true;
          }
        });

        if (hasBrandNew) {
          setIsRinging(true);
          setTimeout(() => setIsRinging(false), 1500);

          if (soundEnabled) {
            playNotificationChime();
          }
        }
      } else {
        initialLoadDoneRef.current = true;
      }

      knownIdsRef.current = currentIds;
    } catch {
      // Ignore network errors during background polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000); // Poll every 8s
    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTabFilter === 'orders') return n.type === 'order';
    if (activeTabFilter === 'inquiries') return n.type === 'inquiry';
    return true;
  });

  const formatRelativeTime = (isoStr: string) => {
    try {
      const now = new Date().getTime();
      const past = new Date(isoStr).getTime();
      if (!past) return 'recently';
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 45) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'recently';
    }
  };

  const handleNotificationClick = (item: AdminNotificationItem) => {
    markAsRead(item.id);
    setIsOpen(false);
    onNavigate(item.targetTab);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* BELL BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Admin Notifications"
        className={`relative p-2.5 rounded-full border transition active:scale-95 flex items-center justify-center ${
          isOpen
            ? 'bg-black text-white border-black shadow-md'
            : unreadCount > 0
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
        }`}
      >
        <Bell className={`w-5 h-5 ${isRinging ? 'animate-bounce text-amber-600' : ''}`} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN POPOVER */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* HEADER */}
          <div className="p-3.5 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="font-display font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Sound alerts ON (click to mute)' : 'Sound alerts MUTED (click to enable)'}
                className={`p-1.5 rounded-md text-xs transition ${
                  soundEnabled ? 'text-emerald-400 hover:bg-neutral-800' : 'text-neutral-500 hover:bg-neutral-800'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all notifications as read"
                  className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-md transition text-xs flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* TAB FILTERS */}
          <div className="flex border-b border-neutral-200 bg-neutral-50 text-xs font-semibold px-2 py-1.5 gap-1">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                activeTabFilter === 'all' ? 'bg-white text-black shadow-sm font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTabFilter('orders')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                activeTabFilter === 'orders' ? 'bg-white text-black shadow-sm font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <ShoppingBag className="w-3 h-3 text-blue-600" />
              Orders ({notifications.filter((n) => n.type === 'order').length})
            </button>
            <button
              onClick={() => setActiveTabFilter('inquiries')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1 ${
                activeTabFilter === 'inquiries' ? 'bg-white text-black shadow-sm font-bold' : 'text-neutral-600 hover:text-black'
              }`}
            >
              <Mail className="w-3 h-3 text-emerald-600" />
              Queries ({notifications.filter((n) => n.type === 'inquiry').length})
            </button>
          </div>

          {/* NOTIFICATION ITEMS LIST */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center text-neutral-400 text-xs font-light">
                No notifications found.
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = !readIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition hover:bg-neutral-50 ${
                      isUnread ? 'bg-amber-50/40' : 'bg-white'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-none mt-0.5 ${
                        item.type === 'order' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.type === 'order' ? <ShoppingBag className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    </div>

                    {/* Body */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${isUnread ? 'text-neutral-900' : 'text-neutral-700'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-neutral-400 flex-none">{formatRelativeTime(item.timestamp)}</span>
                      </div>
                      <p className="text-xs text-neutral-600 truncate font-light mt-0.5">{item.subtitle}</p>
                    </div>

                    {/* Unread Dot */}
                    {isUnread && <span className="w-2 h-2 rounded-full bg-red-600 flex-none self-center"></span>}
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="p-2.5 bg-neutral-50 border-t border-neutral-200 text-center">
            <span className="text-[11px] text-neutral-500 font-light">
              Click any notification to open in dashboard • Sound: {soundEnabled ? 'ON 🔊' : 'MUTED 🔇'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
