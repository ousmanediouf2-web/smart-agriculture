// URL backend via variable d'environnement Vite
// IMPORTANT: cette variable doit être configurée sur Render (Environment)
// avec l'URL exacte du backend actuellement déployé. Aucun fallback codé
// en dur n'est utilisé pour éviter de pointer silencieusement vers un
// ancien backend après une migration.
export const BACKEND_URL = import.meta.env.VITE_API_URL;
if (!BACKEND_URL) {
  console.error('❌ VITE_API_URL non définie ! Configurez cette variable sur Render (frontend) avec l\'URL du backend.');
}

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

const request = async (method, path, body = null, isBlob = false) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${BACKEND_URL}/api${path}`, options);
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  if (isBlob) return res.blob();

  const text = await res.text();
  if (!text) {
    return { success: false, message: `Erreur serveur (${res.status}). Réessayez dans un instant.` };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Réponse inattendue du serveur (${res.status}).` };
  }
};

export const authAPI = {
  login: (data) => request('POST', '/auth/login', data),
  register: (data) => request('POST', '/auth/register', data),
  me: () => request('GET', '/auth/me'),
  updateProfile: (data) => request('PUT', '/auth/profile', data)
};

export const measuresAPI = {
  getAll: (params = {}) => request('GET', '/measures?' + new URLSearchParams(params)),
  getStats: (params = {}) => request('GET', '/measures/stats?' + new URLSearchParams(params))
};

export const sensorsAPI = {
  getAll: () => request('GET', '/sensors'),
  getStatus: (id) => request('GET', `/sensors/${id}/status`),
  create: (data) => request('POST', '/sensors', data),
  setPump: (id, state, mode) => request('PUT', `/sensors/${id}/pump`, { state, mode }),
  delete: (id) => request('DELETE', `/sensors/${id}`)
};

export const parcelsAPI = {
  getAll: () => request('GET', '/parcels'),
  getDetail: (id) => request('GET', `/parcels/${id}/detail`),
  create: (data) => request('POST', '/parcels', data),
  update: (id, data) => request('PUT', `/parcels/${id}`, data),
  delete: (id) => request('DELETE', `/parcels/${id}`),
  getStats: (id, params = {}) => request('GET', `/parcels/${id}/stats?` + new URLSearchParams(params))
};

export const cropsAPI = {
  getAll: () => request('GET', '/crops'),
  update: (id, data) => request('PUT', `/crops/${id}`, data)
};

export const alertsAPI = {
  getAll: (params = {}) => request('GET', '/alerts?' + new URLSearchParams(params)),
  acknowledge: (id) => request('PUT', `/alerts/${id}/acknowledge`),
  acknowledgeAll: () => request('PUT', '/alerts/acknowledge-all')
};

export const usersAPI = {
  getAll: () => request('GET', '/users'),
  create: (data) => request('POST', '/users', data),
  update: (id, data) => request('PUT', `/users/${id}`, data),
  delete: (id) => request('DELETE', `/users/${id}`),
  resetPassword: (id, password) => request('PUT', `/users/${id}/password`, { password })
};

export const satelliteAPI = {
  getImages: (parcelId) => request('GET', `/satellite/${parcelId}`),
  refresh: (parcelId) => request('POST', `/satellite/${parcelId}/refresh`)
};

const downloadBlob = async (path, filename) => {
  const blob = await request('GET', path, null, true);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const exportAPI = {
  measuresCsv: (params = {}) => downloadBlob('/export/measures/csv?' + new URLSearchParams(params), `mesures_${Date.now()}.csv`),
  measuresJson: (params = {}) => downloadBlob('/export/measures/json?' + new URLSearchParams(params), `mesures_${Date.now()}.json`),
  alertsCsv: () => downloadBlob('/export/alerts/csv', `alertes_${Date.now()}.csv`),
  sendMeasuresCsvToTelegram: (params = {}) => request('POST', '/export/measures/csv/telegram', params),
  sendAlertsCsvToTelegram: () => request('POST', '/export/alerts/csv/telegram', {})
};

export const weatherAPI = {
  get: (lat, lng) => request('GET', `/weather?lat=${lat}&lng=${lng}`)
};

export const pumpHistoryAPI = {
  getAll: (params = {}) => request('GET', '/pump-history?' + new URLSearchParams(params))
};

export const assistantAPI = {
  chat: (message) => request('POST', '/assistant/chat', { message })
};
