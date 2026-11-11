import React from 'react';
import { Filter, X } from 'lucide-react';

export default function UserFilterBar({ users, selectedUserId, onChange, label = 'Filtrer par utilisateur' }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)' }}>
      <div className="flex items-center gap-2 text-xs font-medium flex-shrink-0" style={{ color: 'var(--a-text3)' }}>
        <Filter size={12} style={{ color: 'var(--a-primary)' }} />
        <span className="hidden sm:inline">{label}</span>
      </div>
      <select
        value={selectedUserId}
        onChange={e => onChange(e.target.value)}
        className="ainput flex-1 text-sm"
        style={{ minWidth: 0 }}>
        <option value="all">🌍 Tous les utilisateurs</option>
        {users.map(u => (
          <option key={u._id} value={u._id}>
            {u.role === 'admin' ? '👑' : '🌱'} {u.name} ({u.email})
          </option>
        ))}
      </select>
      {selectedUserId !== 'all' && (
        <button onClick={() => onChange('all')}
          className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--a-text3)', background: 'var(--a-border)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--a-danger-light)'; e.currentTarget.style.color = 'var(--a-danger)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--a-border)'; e.currentTarget.style.color = 'var(--a-text3)'; }}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}
