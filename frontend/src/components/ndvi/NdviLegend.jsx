import React from 'react';
import { NDVI_CLASSES } from '../../utils/ndvi';

// Légende de l'échelle NDVI (barre continue + classes)
export default function NdviLegend({ compact = false }) {
  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        {NDVI_CLASSES.map(c => <div key={c.key} style={{ flex: 1, background: c.color }} />)}
      </div>
      <div className="flex justify-between mt-1" style={{ fontSize: 10, color: 'var(--f-text3)' }}>
        <span>0</span><span>0,2</span><span>0,3</span><span>0,45</span><span>0,6</span><span>1</span>
      </div>
      {!compact && (
        <ul className="mt-3 space-y-1.5">
          {NDVI_CLASSES.map(c => (
            <li key={c.key} className="flex items-center gap-2" style={{ fontSize: 12, color: 'var(--f-text2)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
              <span className="flex-1">{c.label}</span>
              <span className="tabular-nums" style={{ color: 'var(--f-text3)' }}>{c.range}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
