import React, { useEffect, useState } from 'react';

export default function PageLoader({ text = 'Chargement...' }) {
  return (
    <div className="page-loader-overlay">
      <img src="/logo.png" alt="AgroSmart" className="page-loader-logo" />
      <p className="page-loader-text">{text}</p>
      <div className="page-loader-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

// Loader inline pour les sections
export function InlineLoader({ size = 32, text = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 0' }}>
      <img src="/logo.png" alt="chargement"
        style={{ width: size, height: size, animation: 'logo-spin 1s linear infinite', objectFit: 'contain' }} />
      {text && <p style={{ color: 'var(--f-text3)', fontSize: 13 }}>{text}</p>}
    </div>
  );
}

// Loader admin (bleu)
export function AdminLoader({ text = 'Chargement...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 0' }}>
      <img src="/logo.png" alt="chargement"
        style={{ width: 48, height: 48, animation: 'logo-spin 1s linear infinite', objectFit: 'contain' }} />
      <p style={{ color: 'var(--a-text3)', fontSize: 13 }}>{text}</p>
    </div>
  );
}
