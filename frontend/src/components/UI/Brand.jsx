import React from 'react';

// Vrai logo AgroSmart sur une plaque blanche (lisible sur fond sombre)
export function BrandLogo({ height = 44, plate = true }) {
  const img = <img src="/logo-brand.png" alt="AgroSmart" style={{ height, width: 'auto', display: 'block' }} />;
  if (!plate) return img;
  return (
    <div style={{ background: '#ffffff', borderRadius: 12, padding: '8px 12px', display: 'inline-flex' }}>
      {img}
    </div>
  );
}

export default function Brand({ subtitle, height = 44 }) {
  return (
    <div className="min-w-0">
      <BrandLogo height={height} />
      {subtitle && (
        <p style={{ fontSize: 11.5, marginTop: 8, fontWeight: 600, color: 'rgba(185,207,194,0.85)' }}>{subtitle}</p>
      )}
    </div>
  );
}
