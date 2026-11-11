import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Trash2, Cpu, Ruler, Map as MapIcon, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { parcelsAPI, satelliteAPI } from '../api';
import { getParcelStatusLabel } from '../utils/status';
import { ndviColor, formatNdvi, getNdviClass } from '../utils/ndvi';
import NdviBadge from '../components/ndvi/NdviBadge';

const CROP_COLORS = { tomate: '#c0392b', aubergine: '#6d3fc0', manioc: '#2b57c4' };

const STATUS_STYLE = {
  optimal:  { bg: 'var(--f-primary-light)', color: 'var(--f-primary)' },
  active:   { bg: 'var(--f-primary-light)', color: 'var(--f-primary)' },
  dry:      { bg: 'var(--f-danger-light)',  color: 'var(--f-danger)' },
  wet:      { bg: 'var(--f-info-light)',    color: 'var(--f-info)' },
  inactive: { bg: 'var(--f-surface2)',      color: 'var(--f-text3)' },
};

export default function ParcelsPage() {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [ndvi, setNdvi] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchParcels = async () => {
    setLoading(true);
    try {
      const data = await parcelsAPI.getAll();
      if (data.success) setParcels(data.data || []);
      else toast.error(data.message || 'Erreur de chargement');
    } catch {
      toast.error('Erreur de chargement des parcelles');
    } finally {
      setLoading(false);
    }
    // NDVI chargé séparément : il ne doit pas bloquer l'affichage de la liste
    satelliteAPI.getSummary().then(res => {
      if (res?.success) {
        const map = {};
        (res.data || []).forEach(d => { map[d.parcelId] = d; });
        setNdvi(map);
      }
    }).catch(() => {});
  };

  useEffect(() => { fetchParcels(); }, []);

  const handleDelete = async (parcel) => {
    if (!window.confirm(`Supprimer la parcelle « ${parcel.name} » ? Cette action est définitive.`)) return;
    try {
      const data = await parcelsAPI.delete(parcel._id);
      if (data.success) { toast.success('Parcelle supprimée'); fetchParcels(); }
      else toast.error(data.message);
    } catch { toast.error('Suppression impossible'); }
  };

  const totals = useMemo(() => {
    const area = parcels.reduce((s, p) => s + (p.area || 0), 0);
    const sensors = parcels.reduce((s, p) => s + (p.sensorCount || 0), 0);
    const vals = Object.values(ndvi).map(d => d.ndvi).filter(v => v != null);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { area, sensors, mean };
  }, [parcels, ndvi]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: '50%', border: '2.5px solid var(--f-border)', borderTopColor: 'var(--f-primary)' }} />
    </div>
  );

  return (
    <div className="space-y-5 page-enter">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Mes parcelles</h1>
          <p className="page-sub">{parcels.length} parcelle{parcels.length > 1 ? 's' : ''} suivie{parcels.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/map')} className="btn-primary flex items-center gap-2">
          <MapIcon size={14} />Tracer sur la carte
        </button>
      </div>

      {parcels.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Parcelles', value: parcels.length, unit: '' },
            { label: 'Surface suivie', value: totals.area ? totals.area.toFixed(2) : '—', unit: totals.area ? 'ha' : '' },
            { label: 'Capteurs installés', value: totals.sensors, unit: '' },
            { label: 'NDVI moyen', value: formatNdvi(totals.mean), unit: '', color: totals.mean != null ? ndviColor(totals.mean) : null },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="stat-card">
              <p className="eyebrow">{label}</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                {color && <span style={{ width: 10, height: 10, borderRadius: 3, background: color, alignSelf: 'center' }} />}
                <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--f-text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                {unit && <span style={{ fontSize: 13, color: 'var(--f-text3)' }}>{unit}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {parcels.length === 0 ? (
        <div className="card text-center" style={{ padding: '56px 24px' }}>
          <Layers size={34} className="mx-auto mb-3" style={{ color: 'var(--f-text3)' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--f-text)' }}>Aucune parcelle pour l’instant</p>
          <p className="page-sub mb-5">Dessinez votre première parcelle sur la carte pour suivre son NDVI et ses capteurs.</p>
          <button onClick={() => navigate('/map')} className="btn-primary">Ouvrir la carte</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {parcels.map(parcel => {
            const color = parcel.color || CROP_COLORS[parcel.cropType] || '#1f7a4d';
            const n = ndvi[parcel._id];
            const st = STATUS_STYLE[parcel.status] || STATUS_STYLE.inactive;
            const cls = n ? getNdviClass(n.ndvi) : null;
            return (
              <article key={parcel._id} className="card flex flex-col" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Bandeau NDVI : la couleur porte l'information de santé de la culture */}
                <div style={{ height: 6, background: n ? ndviColor(n.ndvi) : 'var(--f-border)' }} />
                <div style={{ padding: 20 }} className="flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
                        <h3 className="truncate" style={{ fontSize: 16, fontWeight: 800, color: 'var(--f-text)' }}>{parcel.name}</h3>
                      </div>
                      <p className="page-sub capitalize">{parcel.cropId?.label || parcel.cropType}</p>
                    </div>
                    <span className="badge" style={{ background: st.bg, color: st.color }}>{getParcelStatusLabel(parcel.status)}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl mb-4" style={{ padding: '10px 12px', background: 'var(--f-surface2)', border: '1px solid var(--f-border2)' }}>
                    <div>
                      <p className="eyebrow">Vigueur de la culture</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--f-text2)', marginTop: 2 }}>
                        {n ? cls?.label : 'Calcul en cours…'}
                      </p>
                    </div>
                    {n ? <NdviBadge value={n.ndvi} /> : <span className="skeleton" style={{ width: 84, height: 24 }} />}
                  </div>

                  {parcel.cropId?.soilHumidity && (
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      {[
                        ['Minimum', parcel.cropId.soilHumidity.min, '#0e7490'],
                        ['Optimal', parcel.cropId.soilHumidity.optimal, 'var(--f-primary)'],
                        ['Critique', parcel.cropId.soilHumidity.critical, 'var(--f-danger)'],
                      ].map(([label, v, c]) => (
                        <div key={label}>
                          <p className="eyebrow">{label}</p>
                          <p style={{ fontSize: 15, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}%</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-5" style={{ fontSize: 12.5, color: 'var(--f-text3)' }}>
                    <span className="flex items-center gap-1.5"><Cpu size={13} />{parcel.sensorCount ?? 0} capteur{(parcel.sensorCount ?? 0) > 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1.5"><Ruler size={13} />{parcel.area ? `${parcel.area} ha` : 'Surface non renseignée'}</span>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => navigate(`/parcels/${parcel._id}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      Voir la fiche <ArrowRight size={14} />
                    </button>
                    <button onClick={() => handleDelete(parcel)} aria-label={`Supprimer ${parcel.name}`} title="Supprimer"
                      className="btn-secondary" style={{ padding: '8px 11px', color: 'var(--f-danger)' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
