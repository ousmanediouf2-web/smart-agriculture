import React from 'react';

export default function PageLoader({ text = 'Chargement…' }) {
  return (
    <div className="page-loader-overlay">
      <img src="/logo-brand.png" alt="AgroSmart" className="page-loader-logo"
        style={{ background: '#fff', borderRadius: 18, padding: '14px 20px', width: 'auto', height: 96 }} />
      <p className="page-loader-text">{text}</p>
    </div>
  );
}

// Indicateur de chargement inline : anneau sobre
export function InlineLoader({ size = 28, text = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '32px 0' }}>
      <div className="animate-spin" style={{ width: size, height: size, borderRadius: '50%',
        border: '2.5px solid var(--f-border)', borderTopColor: 'var(--f-primary)' }} />
      {text && <p style={{ color: 'var(--f-text3)', fontSize: 13 }}>{text}</p>}
    </div>
  );
}

// Indicateur de chargement espace admin
export function AdminLoader({ text = 'Chargement…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 0' }}>
      <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%',
        border: '2.5px solid var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
      <p style={{ color: 'var(--a-text3)', fontSize: 13 }}>{text}</p>
    </div>
  );
}
