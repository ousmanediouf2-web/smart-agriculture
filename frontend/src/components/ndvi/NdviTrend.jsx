import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ndviColor, formatNdvi } from '../../utils/ndvi';

// Courbe d'évolution du NDVI d'une parcelle
export default function NdviTrend({ history = [], height = 160 }) {
  const data = history.map(h => ({ t: format(new Date(h.date), 'dd MMM', { locale: fr }), v: h.value }));
  if (data.length < 2) return null;
  const last = data[data.length - 1].v;
  const color = ndviColor(last);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="ndviFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 1]} ticks={[0, 0.3, 0.6, 1]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <ReferenceLine y={0.6} stroke="#14683a" strokeDasharray="3 3" strokeOpacity={0.5} />
        <Tooltip formatter={(v) => [formatNdvi(v), 'NDVI']}
          contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid var(--f-border)' }} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} fill="url(#ndviFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
