import React from 'react';
import { Settings, Database, Bell, Shield, Globe } from 'lucide-react';

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--a-border)' },
  rowLast: { display: 'flex', justifyContent: 'space-between', padding: '10px 0' },
  text: { color: 'var(--a-text)' },
  text2: { color: 'var(--a-text2)' },
  text3: { color: 'var(--a-text3)' },
  green: { color: '#059669', fontWeight: 600 },
};

const InfoCard = ({ icon: Icon, title, rows }) => (
  <div style={S.card}>
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} style={{ color: 'var(--a-primary)' }} />
      <h2 className="text-sm font-semibold" style={S.text2}>{title}</h2>
    </div>
    <div className="text-xs">
      {rows.map(([label, value, isLast], i) => (
        <div key={i} style={isLast ? S.rowLast : S.row}>
          <span style={S.text3}>{label}</span>
          <span style={typeof value === 'string' && value.startsWith('✓') ? S.green : S.text}>{value}</span>
        </div>
      ))}
    </div>
  </div>
);

export default function AdminSettings() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
          <Settings size={18} style={{ color: 'var(--a-primary)' }} />
          Configuration système
        </h1>
        <p className="text-xs mt-0.5" style={S.text3}>Paramètres globaux de la plateforme</p>
      </div>

      <InfoCard icon={Database} title="Base de données" rows={[
        ['Provider', 'MongoDB Atlas', false],
        ['Statut', '✓ Connecté', false],
        ['Environnement', 'Production (Render)', true],
      ]} />

      <InfoCard icon={Bell} title="Notifications Telegram" rows={[
        ['Alerte capteur hors ligne', '✓ Actif', false],
        ['Rapport journalier (7h00)', '✓ Actif', false],
        ['Mise à jour satellite (5j)', '✓ Actif', true],
      ]} />

      <InfoCard icon={Globe} title="Données satellite (Sentinel Hub)" rows={[
        ['Fréquence de mise à jour', 'Toutes les 5 jours', false],
        ['Source', 'Sentinel-2 L2A', true],
      ]} />

      <InfoCard icon={Shield} title="Sécurité" rows={[
        ['Authentification', 'JWT (7 jours)', false],
        ['Rate limiting', '✓ Actif', false],
        ['Route init-db', '✓ Protégée', true],
      ]} />
    </div>
  );
}
