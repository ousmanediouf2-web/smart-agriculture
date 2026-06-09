import React, { useEffect, useState, useRef } from 'react';
import { Upload, Download, Plane, MapPin, Info, CheckCircle, Loader, Image, RefreshCw, AlertCircle, X } from 'lucide-react';
import { parcelsAPI, BACKEND_URL } from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');

// Calcule la grille de vol pour une parcelle
const computeFlightPlan = (parcel, altitude = 50, overlap = 75) => {
  if (!parcel?.geometry?.coordinates) return null;
  const coords = parcel.geometry.coordinates[0];
  const lats = coords.map(c => c[1]);
  const lngs = coords.map(c => c[0]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;

  // GSD (Ground Sample Distance) selon altitude - Mini 2 capteur 1/2.3"
  const sensorWidth = 6.3; // mm
  const focalLength = 4.49; // mm Mini 2
  const imageWidth = 4000; // px
  const gsd = (sensorWidth * altitude * 100) / (focalLength * imageWidth); // cm/px

  // Distance entre passages selon overlap
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(centerLat * Math.PI / 180);
  const heightM = (maxLat - minLat) * metersPerDegLat;
  const widthM = (maxLng - minLng) * metersPerDegLng;
  const footprintW = (sensorWidth / focalLength) * altitude; // m
  const footprintH = (4.7 / focalLength) * altitude; // m (ratio 4:3)
  const stepLng = (footprintW * (1 - overlap / 100)) / metersPerDegLng;
  const stepLat = (footprintH * (1 - overlap / 100)) / metersPerDegLat;

  // Génération des waypoints en serpentin
  const waypoints = [];
  let lat = minLat;
  let direction = 1;
  let wpIndex = 0;

  while (lat <= maxLat + stepLat * 0.5) {
    const lngStart = direction === 1 ? minLng : maxLng;
    const lngEnd = direction === 1 ? maxLng : minLng;
    waypoints.push({ lat: Math.min(lat, maxLat), lng: lngStart, alt: altitude, index: wpIndex++ });
    waypoints.push({ lat: Math.min(lat, maxLat), lng: lngEnd, alt: altitude, index: wpIndex++ });
    lat += stepLat;
    direction *= -1;
  }

  const numPhotos = Math.ceil(widthM / (footprintW * (1 - overlap / 100))) *
                    Math.ceil(heightM / (footprintH * (1 - overlap / 100)));
  const distanceKm = waypoints.length > 1 ?
    waypoints.reduce((sum, wp, i) => {
      if (i === 0) return 0;
      const prev = waypoints[i - 1];
      const dLat = (wp.lat - prev.lat) * metersPerDegLat;
      const dLng = (wp.lng - prev.lng) * metersPerDegLng;
      return sum + Math.sqrt(dLat * dLat + dLng * dLng) / 1000;
    }, 0) : 0;

  const flightTimeMin = Math.ceil((distanceKm / 8) * 60); // ~8 km/h vitesse moyenne
  const batteryNeeded = Math.ceil(flightTimeMin / 25); // Mini 2 ~25 min par batterie

  return {
    waypoints,
    stats: {
      area: (widthM * heightM / 10000).toFixed(2), // hectares
      numPhotos,
      distanceKm: distanceKm.toFixed(2),
      flightTimeMin,
      batteryNeeded,
      gsd: gsd.toFixed(1),
      altitude
    }
  };
};

// Génère le CSV compatible Litchi
const generateLitchiCSV = (waypoints, altitude) => {
  const header = 'latitude,longitude,altitude(m),heading(deg),curvesize(m),rotationdir,gimbalmode,gimbalpitchangle,actiontype1,actionparam1,altitudemode,speed(m/s),poi_latitude,poi_longitude,poi_altitude(m),poi_altitudemode,photo_timeinterval,photo_distinterval';
  const rows = waypoints.map(wp =>
    `${wp.lat},${wp.lng},${altitude},0,0,0,0,-90,1,0,0,5,0,0,0,0,-1,10`
  );
  return [header, ...rows].join('\n');
};

export default function DronePage() {
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [altitude, setAltitude] = useState(60);
  const [overlap, setOverlap] = useState(75);
  const [flightPlan, setFlightPlan] = useState(null);
  const [missions, setMissions] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('plan');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);

  useEffect(() => {
    parcelsAPI.getAll().then(res => {
      if (res.success) setParcels(res.data || []);
    });
    // Charger les missions existantes
    loadMissions();
  }, []);

  const loadMissions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/drone/missions`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) setMissions(data.data || []);
    } catch {}
  };

  useEffect(() => {
    if (!selectedParcel) return;
    const plan = computeFlightPlan(selectedParcel, altitude, overlap);
    setFlightPlan(plan);
  }, [selectedParcel, altitude, overlap]);

  // Initialiser carte avec waypoints
  useEffect(() => {
    if (!mapRef.current || !flightPlan || activeTab !== 'plan') return;

    const initMap = async () => {
      if (!window.L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        await new Promise(resolve => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
      const L = window.L;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }

      const center = selectedParcel.center;
      const lat = center?.lat || center?.coordinates?.[1] || 14.15;
      const lng = center?.lng || center?.coordinates?.[0] || -16.07;

      const map = L.map(mapRef.current, { maxZoom: 21 }).setView([lat, lng], 16);
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        attribution: '© Google', maxZoom: 21, subdomains: ['0','1','2','3']
      }).addTo(map);

      // Polygone parcelle
      if (selectedParcel.geometry?.coordinates) {
        const latlngs = selectedParcel.geometry.coordinates[0].map(c => [c[1], c[0]]);
        L.polygon(latlngs, { color: '#2d7a3a', weight: 2, fillOpacity: 0.15 }).addTo(map);
      }

      // Tracer la grille de vol
      const wps = flightPlan.waypoints;
      for (let i = 0; i < wps.length - 1; i++) {
        L.polyline([[wps[i].lat, wps[i].lng], [wps[i+1].lat, wps[i+1].lng]], {
          color: i % 2 === 0 ? '#2563eb' : '#7c3aed', weight: 1.5, dashArray: '4 4', opacity: 0.7
        }).addTo(map);
      }

      // Points de départ et fin
      if (wps.length > 0) {
        const startIcon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>', iconSize: [12,12], iconAnchor: [6,6] });
        const endIcon = L.divIcon({ className: '', html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>', iconSize: [12,12], iconAnchor: [6,6] });
        L.marker([wps[0].lat, wps[0].lng], { icon: startIcon }).addTo(map).bindTooltip('Départ');
        L.marker([wps[wps.length-1].lat, wps[wps.length-1].lng], { icon: endIcon }).addTo(map).bindTooltip('Arrivée');
      }

      leafletMapRef.current = map;
    };

    setTimeout(initMap, 100);
  }, [flightPlan, activeTab]);

  const downloadLitchiCSV = () => {
    if (!flightPlan) return;
    const csv = generateLitchiCSV(flightPlan.waypoints, altitude);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission_${selectedParcel.name.replace(/\s/g, '_')}_${altitude}m.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Plan de vol téléchargé ! Importez dans Litchi 🚁');
  };

  const downloadKML = () => {
    if (!flightPlan) return;
    const wps = flightPlan.waypoints;
    const coords = wps.map(wp => `${wp.lng},${wp.lat},${altitude}`).join('\n                ');
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Mission ${selectedParcel.name}</name>
    <Placemark>
      <name>Plan de vol</name>
      <LineString>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission_${selectedParcel.name.replace(/\s/g, '_')}.kml`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('KML téléchargé ! Ouvrez dans Google Earth 🌍');
  };

  const handleFileUpload = async (files) => {
    if (!selectedParcel) { toast.error('Sélectionnez une parcelle'); return; }
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) { toast.error('Sélectionnez des images JPG/PNG'); return; }
    if (imageFiles.length < 3) { toast.error('Minimum 3 photos requises pour la cartographie'); return; }

    setUploading(true);
    const formData = new FormData();
    imageFiles.forEach(f => formData.append('photos', f));
    formData.append('parcelId', selectedParcel._id);
    formData.append('parcelName', selectedParcel.name);
    formData.append('altitude', altitude);

    try {
      const res = await fetch(`${BACKEND_URL}/api/drone/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ ${imageFiles.length} photos uploadées ! Traitement en cours...`);
        setProcessing(true);
        setActiveTab('missions');
        loadMissions();
        // Polling pour le statut
        const pollInterval = setInterval(async () => {
          await loadMissions();
          const updated = await fetch(`${BACKEND_URL}/api/drone/missions/${data.missionId}`, {
            headers: { Authorization: `Bearer ${token()}` }
          }).then(r => r.json());
          if (updated.data?.status === 'done' || updated.data?.status === 'error') {
            clearInterval(pollInterval);
            setProcessing(false);
            if (updated.data.status === 'done') toast.success('🗺️ Carte drone prête !');
            else toast.error('Erreur de traitement');
            loadMissions();
          }
        }, 5000);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Erreur upload: ' + err.message);
    }
    setUploading(false);
  };

  const S = {
    card: { background: 'var(--f-surface)', border: '1px solid var(--f-border)', borderRadius: 16, padding: 20, boxShadow: 'var(--f-shadow)' },
    text: { color: 'var(--f-text)' },
    text2: { color: 'var(--f-text2)' },
    text3: { color: 'var(--f-text3)' },
  };

  const TABS = [
    { key: 'plan', label: '🚁 Plan de vol', icon: Plane },
    { key: 'upload', label: '📤 Upload photos', icon: Upload },
    { key: 'missions', label: `🗺️ Missions (${missions.length})`, icon: Image },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="fade-up">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--f-text)', fontFamily: "'Playfair Display', serif" }}>
          🚁 Mission Drone
        </h1>
        <p className="text-sm mt-0.5" style={S.text3}>
          Générez votre plan de vol, uploadez vos photos et obtenez une carte aérienne de vos parcelles
        </p>
      </div>

      {/* Info DJI Mini 2 */}
      <div className="rounded-2xl p-4 fade-up" style={{ background: '#eff6ff', border: '1px solid rgba(37,99,235,0.2)' }}>
        <div className="flex items-start gap-3">
          <Info size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
          <div className="text-sm" style={{ color: '#1e40af' }}>
            <p className="font-semibold mb-1">Compatible DJI Mini 2 — Workflow gratuit en 3 étapes :</p>
            <p>1️⃣ <strong>Générez</strong> le plan de vol → suivez le tracé affiché sur la carte en volant manuellement avec votre Mini 2</p>
            <p>2️⃣ <strong>Volez</strong> au-dessus de votre parcelle à altitude constante · Transférez les photos via DJI Fly sur votre téléphone</p>
            <p>3️⃣ <strong>Uploadez</strong> les photos ici → la carte aérienne est générée automatiquement · 100% gratuit ✅</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={activeTab === key
              ? { background: 'linear-gradient(135deg, #2d7a3a, #3d9e4e)', color: 'white', boxShadow: '0 4px 12px rgba(45,122,58,0.3)' }
              : { background: 'var(--f-surface)', border: '1px solid var(--f-border)', color: 'var(--f-text3)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ONGLET PLAN DE VOL ── */}
      {activeTab === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Config */}
          <div className="space-y-4">
            <div style={S.card}>
              <h2 className="text-sm font-semibold mb-4" style={S.text2}>Configuration</h2>

              <div className="mb-4">
                <label className="label">Parcelle *</label>
                <select className="input" value={selectedParcel?._id || ''}
                  onChange={e => setSelectedParcel(parcels.find(p => p._id === e.target.value) || null)}>
                  <option value="">Sélectionner une parcelle</option>
                  {parcels.map(p => <option key={p._id} value={p._id}>{p.name} ({p.cropId?.label || p.cropType})</option>)}
                </select>
              </div>

              <div className="mb-4">
                <label className="label">Altitude de vol : <strong>{altitude}m</strong></label>
                <input type="range" min="30" max="120" step="5" value={altitude}
                  onChange={e => setAltitude(parseInt(e.target.value))}
                  className="w-full accent-green-600" />
                <div className="flex justify-between text-xs mt-1" style={S.text3}>
                  <span>30m (détail)</span><span>120m (large)</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="label">Recouvrement : <strong>{overlap}%</strong></label>
                <input type="range" min="60" max="90" step="5" value={overlap}
                  onChange={e => setOverlap(parseInt(e.target.value))}
                  className="w-full accent-green-600" />
                <div className="flex justify-between text-xs mt-1" style={S.text3}>
                  <span>60% (rapide)</span><span>90% (précis)</span>
                </div>
              </div>

              {/* Stats */}
              {flightPlan && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)' }}>
                  {[
                    ['Surface', `${flightPlan.stats.area} ha`],
                    ['Photos estimées', `${flightPlan.stats.numPhotos}`],
                    ['Distance vol', `${flightPlan.stats.distanceKm} km`],
                    ['Temps estimé', `${flightPlan.stats.flightTimeMin} min`],
                    ['Batteries', `${flightPlan.stats.batteryNeeded}x`],
                    ['Résolution GSD', `${flightPlan.stats.gsd} cm/px`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={S.text3}>{label}</span>
                      <span className="font-semibold" style={S.text}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Téléchargements */}
            {flightPlan && (
              <div style={S.card}>
                <h2 className="text-sm font-semibold mb-3" style={S.text2}>Télécharger le plan</h2>
                <div className="space-y-2">
                  <button onClick={downloadLitchiCSV} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                    <Download size={14} />CSV Litchi (optionnel)
                  </button>
                  <button onClick={downloadKML}
                    className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-xl transition-all"
                    style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', color: 'var(--f-text2)' }}>
                    <Download size={14} />KML Google Earth
                  </button>
                </div>
                <p className="text-xs mt-3" style={S.text3}>
                  💡 <strong>Gratuit :</strong> Suivez le tracé sur la carte en volant manuellement.<br/>
                  Le CSV est disponible si vous souhaitez utiliser Litchi ultérieurement.
                </p>
              </div>
            )}
          </div>

          {/* Carte */}
          <div className="lg:col-span-2">
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--f-border)', boxShadow: 'var(--f-shadow)', height: 480 }}>
              {!selectedParcel ? (
                <div className="flex items-center justify-center h-full flex-col gap-3" style={{ background: 'var(--f-surface2)' }}>
                  <Plane size={36} className="opacity-30" style={{ color: 'var(--f-text3)' }} />
                  <p className="text-sm" style={S.text3}>Sélectionnez une parcelle pour voir le plan de vol</p>
                </div>
              ) : (
                <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
              )}
            </div>
            {flightPlan && (
              <p className="text-xs mt-2 text-center" style={S.text3}>
                🔵 Lignes bleues = passages aller · 🟣 Lignes violettes = passages retour · 🟢 Départ · 🔴 Arrivée
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLET UPLOAD PHOTOS ── */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div style={S.card}>
            <h2 className="text-sm font-semibold mb-4" style={S.text2}>Parcelle concernée</h2>
            <select className="input" value={selectedParcel?._id || ''}
              onChange={e => setSelectedParcel(parcels.find(p => p._id === e.target.value) || null)}>
              <option value="">Sélectionner une parcelle</option>
              {parcels.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          {/* Zone drag & drop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFileUpload(e.dataTransfer.files); }}
            style={{
              background: dragOver ? 'var(--f-primary-light)' : 'var(--f-surface)',
              border: `2px dashed ${dragOver ? 'var(--f-primary)' : 'var(--f-border)'}`,
              borderRadius: 16, padding: 48, textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
              onChange={e => handleFileUpload(e.target.files)} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader size={32} className="animate-spin" style={{ color: 'var(--f-primary)' }} />
                <p className="font-semibold" style={{ color: 'var(--f-primary)' }}>Upload en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload size={36} style={{ color: 'var(--f-text3)', opacity: 0.5 }} />
                <p className="font-semibold" style={S.text}>Glissez vos photos drone ici</p>
                <p className="text-sm" style={S.text3}>ou cliquez pour sélectionner · JPG/PNG · Minimum 3 photos</p>
                <div className="flex gap-2 mt-2 flex-wrap justify-center">
                  {['Photos avec GPS DJI', 'Recouvrement ≥60%', 'Altitude constante', 'Lumière uniforme'].map(tip => (
                    <span key={tip} className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'var(--f-primary-light)', color: 'var(--f-primary)' }}>
                      ✓ {tip}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div style={S.card}>
            <h2 className="text-sm font-semibold mb-3" style={S.text2}>📱 Comment transférer les photos DJI Mini 2</h2>
            <div className="space-y-2">
              {[
                ['1', 'Après le vol, connectez le Mini 2 à la radiocommande et allumez les deux'],
                ['2', 'Ouvrez DJI Fly sur votre téléphone → Album → Sélectionnez toutes les photos'],
                ['3', 'Cliquez "Télécharger" → Les photos sont dans la galerie de votre téléphone'],
                ['4', 'Revenez ici sur la version mobile du site et uploadez les photos'],
                ['5', 'Le traitement démarre automatiquement (5-30 min selon le nombre de photos)'],
              ].map(([num, text]) => (
                <div key={num} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'var(--f-primary)' }}>{num}</div>
                  <p className="text-sm" style={S.text3}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET MISSIONS ── */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={S.text2}>{missions.length} mission(s) drone</h2>
            <button onClick={loadMissions} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--f-surface2)', border: '1px solid var(--f-border)', color: 'var(--f-text3)' }}>
              <RefreshCw size={11} />Actualiser
            </button>
          </div>

          {processing && (
            <div className="rounded-2xl p-4" style={{ background: '#eff6ff', border: '1px solid rgba(37,99,235,0.2)' }}>
              <div className="flex items-center gap-3">
                <Loader size={18} className="animate-spin" style={{ color: '#2563eb' }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1e40af' }}>Traitement en cours...</p>
                  <p className="text-xs" style={{ color: '#3b82f6' }}>Assemblage des photos via WebODM. Cela peut prendre 5 à 30 minutes.</p>
                </div>
              </div>
            </div>
          )}

          {missions.length === 0 ? (
            <div style={S.card} className="text-center py-12">
              <Image size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--f-text3)' }} />
              <p className="text-sm" style={S.text3}>Aucune mission drone. Uploadez vos photos pour commencer.</p>
            </div>
          ) : missions.map(mission => (
            <div key={mission._id} style={S.card}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold" style={S.text}>{mission.parcelName}</p>
                  <p className="text-xs" style={S.text3}>
                    {mission.photoCount} photos · {mission.altitude}m · {format(new Date(mission.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={mission.status === 'done'
                    ? { background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }
                    : mission.status === 'processing'
                    ? { background: '#eff6ff', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)' }
                    : mission.status === 'error'
                    ? { background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }
                    : { background: '#fff7ed', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }}>
                  {mission.status === 'done' ? '✅ Terminé'
                    : mission.status === 'processing' ? '⏳ En cours'
                    : mission.status === 'error' ? '❌ Erreur'
                    : '⏸️ En attente'}
                </span>
              </div>

              {mission.status === 'done' && mission.orthophotoUrl && (
                <div>
                  <img src={`${BACKEND_URL}${mission.orthophotoUrl}`} onError={e => e.target.style.display="none"}
                    alt="Orthophoto"
                    className="w-full rounded-xl mb-2"
                    style={{ maxHeight: 250, objectFit: 'cover' }} />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${BACKEND_URL}${mission.orthophotoUrl}`, {
                            headers: { Authorization: `Bearer ${token()}` }
                          });
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `orthophoto_${mission.parcelName}_${mission._id}.jpg`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Téléchargement lancé !');
                        } catch { toast.error('Erreur téléchargement'); }
                      }}
                      className="btn-primary flex items-center gap-2 text-sm flex-1 justify-center">
                      <Download size={13} />Télécharger l'orthophoto
                    </button>
                  </div>
                </div>
              )}

              {mission.status === 'error' && (
                <div className="rounded-xl p-3" style={{ background: '#fee2e2' }}>
                  <p className="text-xs" style={{ color: '#dc2626' }}>
                    {mission.error || 'Erreur lors du traitement. Vérifiez que les photos ont des coordonnées GPS DJI.'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
