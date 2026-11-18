import React from 'react';
import { Sprout } from 'lucide-react';
import { getNdviClass, formatNdvi } from '../../utils/ndvi';

// Pastille NDVI compacte : valeur + couleur de l'échelle
export default function NdviBadge({ value, size = 'md', showLabel = false }) {
  const cls = getNdviClass(value);
  const color = cls?.color || '#9aa59b';
  const small = size === 'sm';
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums"
      style={{
        padding: small ? '2px 8px' : '4px 10px',
        borderRadius: 999,
        fontSize: small ? 11 : 12,
        color: '#10231a',
        background: `${color}26`,
        border: `1px solid ${color}66`
      }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
      {!small && <Sprout size={12} style={{ color }} />}
      NDVI {formatNdvi(value)}
      {showLabel && cls && <span style={{ fontWeight: 500, color: 'var(--f-text2)' }}>· {cls.label}</span>}
    </span>
  );
}
