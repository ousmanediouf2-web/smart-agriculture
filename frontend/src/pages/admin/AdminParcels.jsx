import React, { useEffect, useState } from 'react';
import { Layers, Trash2, RefreshCw } from 'lucide-react';
import { BACKEND_URL } from '../../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import UserFilterBar from '../../components/UI/UserFilterBar';
import { useAdminFilter } from '../../hooks/useAdminFilter';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const adminFetch = (method, path) =>
  fetch(`${BACKEND_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
  }).then(r => r.json());

const S = {
  card: { background: 'var(--a-surface)', border: '1px solid var(--a-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--a-shadow)' },
  row: { background: 'var(--a-surface2)', border: '1px solid var(--a-border)', borderRadius: 12, padding: 14 },
  text: { color: 'var(--a-text)' },
  text3: { color: 'var(--a-text3)' },
};

export default function AdminParcels() {
  const { users, selectedUserId, setSelectedUserId } = useAdminFilter();
  const [allParcels, setAllParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParcels = async () => {
    const res = await adminFetch('GET', '/parcels');
    if (res.success) setAllParcels(res.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchParcels(); }, []);

  const parcels = selectedUserId === 'all' ? allParcels
    : allParcels.filter(p => (p.userId?._id || p.userId) === selectedUserId);

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette parcelle ?')) return;
    await adminFetch('DELETE', `/parcels/${id}`);
    toast.success('Parcelle supprimée');
    fetchParcels();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={S.text}>
            <Layers size={18} style={{ color: 'var(--a-primary)' }} />
            Parcelles
          </h1>
          <p className="text-xs mt-0.5" style={S.text3}>
            {parcels.length} parcelle(s) {selectedUserId !== 'all' ? 'de cet utilisateur' : 'au total'}
          </p>
        </div>
        <button onClick={fetchParcels}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'var(--a-surface2)', border: '1px solid var(--a-border)', color: 'var(--a-text3)' }}>
          <RefreshCw size={12} />Actualiser
        </button>
      </div>

      <UserFilterBar users={users} selectedUserId={selectedUserId} onChange={setSelectedUserId} />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 rounded-full"
            style={{ borderColor: 'var(--a-border)', borderTopColor: 'var(--a-primary)' }} />
        </div>
      ) : parcels.length === 0 ? (
        <div className="text-center py-12 text-sm" style={S.text3}>
          Aucune parcelle{selectedUserId !== 'all' ? ' pour cet utilisateur' : ''}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {parcels.map(parcel => {
            const owner = users.find(u => u._id === (parcel.userId?._id || parcel.userId));
            return (
              <div key={parcel._id} style={S.row}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: parcel.color || '#22c55e' }} />
                    <div>
                      <p className="font-semibold text-sm" style={S.text}>{parcel.name}</p>
                      <p className="text-xs" style={S.text3}>{parcel.cropId?.label || parcel.cropType} • {parcel.status}</p>
                      <p className="text-xs" style={S.text3}>{parcel.sensors?.length || 0} capteur(s)</p>
                      {selectedUserId === 'all' && owner && (
                        <p className="text-xs" style={{ color: 'var(--a-primary)' }}>👤 {owner.name}</p>
                      )}
                      <p className="text-xs" style={S.text3}>
                        Créée: {format(new Date(parcel.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(parcel._id)}
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--a-text3)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--a-text3)'; e.currentTarget.style.background = 'transparent'; }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
