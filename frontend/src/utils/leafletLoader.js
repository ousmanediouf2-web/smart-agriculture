// Chargement unique de Leaflet + Leaflet.draw (CDN) partagé par toutes les cartes
let loading = null;

const addCss = (href) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const addScript = (src) => new Promise((resolve, reject) => {
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing && existing.dataset.loaded === '1') return resolve();
  const script = existing || document.createElement('script');
  script.addEventListener('load', () => { script.dataset.loaded = '1'; resolve(); });
  script.addEventListener('error', () => reject(new Error(`Échec de chargement : ${src}`)));
  if (!existing) { script.src = src; document.head.appendChild(script); }
});

const FRENCH_DRAW = {
  draw: {
    toolbar: {
      actions: { title: 'Annuler le tracé', text: 'Annuler' },
      finish: { title: 'Terminer le tracé', text: 'Terminer' },
      undo: { title: 'Supprimer le dernier point', text: 'Retirer le dernier point' },
      buttons: { polygon: 'Tracer une parcelle' }
    },
    handlers: {
      polygon: {
        tooltip: {
          start: 'Cliquez pour placer le premier point',
          cont: 'Cliquez pour continuer le tracé',
          end: 'Cliquez sur le premier point pour fermer la parcelle'
        }
      }
    }
  },
  edit: {
    toolbar: {
      actions: {
        save: { title: 'Enregistrer les modifications', text: 'Enregistrer' },
        cancel: { title: 'Annuler les modifications', text: 'Annuler' },
        clearAll: { title: 'Tout supprimer', text: 'Tout supprimer' }
      },
      buttons: { edit: 'Modifier les tracés', editDisabled: 'Aucun tracé à modifier', remove: 'Supprimer les tracés', removeDisabled: 'Aucun tracé à supprimer' }
    },
    handlers: {
      edit: { tooltip: { text: 'Déplacez les points pour modifier', subtext: 'Cliquez sur Annuler pour revenir en arrière' } },
      remove: { tooltip: { text: 'Cliquez sur un tracé pour le supprimer' } }
    }
  }
};

export const loadLeaflet = ({ draw = true } = {}) => {
  if (!loading) {
    loading = (async () => {
      addCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
      addCss('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css');
      if (!window.L) await addScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
      if (!window.L.Draw) await addScript('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js');
      if (window.L.drawLocal) {
        const t = window.L.drawLocal;
        Object.assign(t.draw.toolbar.actions, FRENCH_DRAW.draw.toolbar.actions);
        Object.assign(t.draw.toolbar.finish, FRENCH_DRAW.draw.toolbar.finish);
        Object.assign(t.draw.toolbar.undo, FRENCH_DRAW.draw.toolbar.undo);
        Object.assign(t.draw.toolbar.buttons, FRENCH_DRAW.draw.toolbar.buttons);
        Object.assign(t.draw.handlers.polygon.tooltip, FRENCH_DRAW.draw.handlers.polygon.tooltip);
        Object.assign(t.edit.toolbar.actions.save, FRENCH_DRAW.edit.toolbar.actions.save);
        Object.assign(t.edit.toolbar.actions.cancel, FRENCH_DRAW.edit.toolbar.actions.cancel);
        Object.assign(t.edit.toolbar.actions.clearAll, FRENCH_DRAW.edit.toolbar.actions.clearAll);
        Object.assign(t.edit.toolbar.buttons, FRENCH_DRAW.edit.toolbar.buttons);
        Object.assign(t.edit.handlers.edit.tooltip, FRENCH_DRAW.edit.handlers.edit.tooltip);
        Object.assign(t.edit.handlers.remove.tooltip, FRENCH_DRAW.edit.handlers.remove.tooltip);
      }
      return window.L;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
};

// Échappe le HTML injecté dans les popups Leaflet (noms saisis par les utilisateurs)
export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const BASE_LAYERS = (L) => {
  const google = (lyrs) => L.tileLayer(`https://mt{s}.google.com/vt/lyrs=${lyrs}&x={x}&y={y}&z={z}`,
    { attribution: '© Google', maxZoom: 21, subdomains: ['0', '1', '2', '3'] });
  return {
    'Satellite': google('s'),
    'Satellite + noms': google('y'),
    'Esri imagerie': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri, Maxar, Earthstar Geographics', maxZoom: 21, maxNativeZoom: 19 }),
    'Plan': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap, © CARTO', maxZoom: 20 })
  };
};
