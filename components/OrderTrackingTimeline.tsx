'use client';

import React from 'react';
import {
  ClipboardList,
  CheckCircle,
  Package,
  Truck,
  MapPin,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw,
  DollarSign,
  Check
} from 'lucide-react';
import { OrderTrackingEvent, CanonicalOrderStatus, STATUS_DISPLAY_MAP } from '../lib/order-tracking';

interface Props {
  timeline: OrderTrackingEvent[];
  currentStatus: CanonicalOrderStatus;
}

const statusOrder: CanonicalOrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'in-transit',
  'out-for-delivery',
  'delivered',
];

export default function OrderTrackingTimeline({ timeline, currentStatus }: Props) {
  const getEventIcon = (status: CanonicalOrderStatus) => {
    switch (status) {
      case 'placed':
        return <ClipboardList className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'packed':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'in-transit':
        return <Truck className="w-4 h-4" />;
      case 'out-for-delivery':
        return <MapPin className="w-4 h-4" />;
      case 'delivered':
        return <Check className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'delivery-attempted':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'returned':
        return <RotateCcw className="w-4 h-4" />;
      case 'refunded':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  // Build standard step progress for upper visual bar if in standard flow
  const isExceptional = ['cancelled', 'delivery-attempted', 'returned', 'refunded'].includes(currentStatus);
  const currentStepIdx = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-6">
      {/* STANDARD STEP PROGRESS BAR (For normal flows) */}
      {!isExceptional && currentStepIdx >= 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-6 shadow-sm">
          {/* Desktop Horizontal Stepper */}
          <div className="hidden md:block relative w-full pt-1 pb-1">
            {/* Background line across all step centers */}
            <div className="absolute top-[19px] left-8 right-8 h-0.5 bg-neutral-200 z-0" />

            {/* Active completed progress line */}
            <div
              className="absolute top-[19px] left-8 h-0.5 bg-black transition-all duration-500 z-0"
              style={{
                width: `calc(${((currentStepIdx) / (statusOrder.length - 1)) * 100}% - 16px)`,
              }}
            />

            <div className="flex items-start justify-between w-full relative z-10">
              {statusOrder.map((step, idx) => {
                const isDone = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const title = STATUS_DISPLAY_MAP[step]?.title || step;

                return (
                  <div key={step} className="flex-1 flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition duration-300 ${
                        isCurrent
                          ? 'bg-black border-black text-white ring-4 ring-neutral-200/80 shadow-sm'
                          : isDone
                          ? 'bg-black border-black text-white'
                          : 'border-neutral-300 text-neutral-400 bg-white'
                      }`}
                    >
                      {getEventIcon(step)}
                    </div>
                    <p
                      className={`text-[11px] font-bold mt-2 text-center transition ${
                        isCurrent ? 'text-black font-extrabold' : isDone ? 'text-neutral-800 font-semibold' : 'text-neutral-400 font-normal'
                      }`}
                    >
                      {title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Summary Stepper Bar */}
          <div className="md:hidden flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Progress Step {currentStepIdx + 1} of {statusOrder.length}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {STATUS_DISPLAY_MAP[currentStatus]?.title}
            </span>
          </div>
        </div>
      )}

      {/* DETAILED EVENT TIMELINE LIST */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-neutral-800" /> Tracking Event History ({timeline.length})
        </h4>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
          {timeline.map((evt, idx) => {
            const isFirst = idx === 0;
            const isLatest = idx === timeline.length - 1;

            return (
              <div key={evt.id || idx} className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                {/* Event Dot */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${
                    isLatest ? 'border-black text-black ring-2 ring-neutral-200' : 'border-neutral-400 text-neutral-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isLatest ? 'bg-black' : 'bg-neutral-400'}`}></span>
                </div>

                {/* Event Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-xs sm:text-sm font-bold ${isLatest ? 'text-black font-extrabold' : 'text-neutral-800'}`}>
                      {evt.title || STATUS_DISPLAY_MAP[evt.status]?.title || evt.status}
                    </p>
                    {evt.location && (
                      <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> {evt.location}
                      </span>
                    )}
                  </div>
                  {evt.description && (
                    <p className="text-xs text-neutral-600 font-light leading-relaxed mt-1">{evt.description}</p>
                  )}
                </div>

                {/* Event Timestamp */}
                <span className="text-[11px] font-medium text-neutral-400 shrink-0 mt-0.5 sm:mt-0">
                  {formatDate(evt.occurredAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
