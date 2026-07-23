'use client';

import React, { useState } from 'react';

const WHATSAPP_NUMBER = '923220714148';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export default function WhatsAppFloatingButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      id="whatsapp-floating-btn"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="whatsapp-float"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: hovered ? '10px' : '0px',
        backgroundColor: '#25D366',
        color: '#fff',
        borderRadius: '50px',
        padding: hovered ? '12px 20px 12px 14px' : '14px',
        boxShadow: '0 4px 20px rgba(37, 211, 102, 0.4)',
        textDecoration: 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        cursor: 'pointer',
      }}
    >
      {/* WhatsApp SVG Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="currentColor"
        style={{ width: '28px', height: '28px', flexShrink: 0 }}
      >
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.962A15.93 15.93 0 0016.004 32C24.826 32 32 24.826 32 16.004 32 7.176 24.826 0 16.004 0zm9.332 22.618c-.396 1.116-1.962 2.04-3.186 2.31-.84.18-1.938.324-5.634-1.212-4.728-1.962-7.77-6.768-8.004-7.086-.228-.318-1.878-2.502-1.878-4.77s1.188-3.384 1.61-3.846c.396-.432 1.044-.648 1.662-.648.198 0 .378.018.54.036.42.018.636.042.918.708.354.834 1.218 2.97 1.326 3.186.108.216.216.504.072.798-.144.3-.27.432-.486.684-.216.252-.432.444-.648.714-.198.234-.42.486-.18.918s1.062 1.746 2.28 2.826c1.566 1.392 2.886 1.824 3.294 2.028.408.198.648.174.894-.072.252-.252 1.062-1.224 1.35-1.644.282-.42.57-.348.96-.21.396.144 2.502 1.182 2.928 1.392.432.216.714.324.822.504.108.18.108 1.026-.288 2.142z" />
      </svg>
      {hovered && (
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
          }}
        >
          Chat with us
        </span>
      )}
    </a>
  );
}
