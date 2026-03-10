const API_BASE_URL = 'http://localhost:4000';

async function apiRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = options.headers ? { ...options.headers } : {};

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    // eslint-disable-next-line no-param-reassign
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const message = data && data.error && data.error.message
      ? data.error.message
      : 'Une erreur est survenue lors de l’appel API.';
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return data;
}

// Helpers spécifiques

function apiGetProperties(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return apiRequest(`/api/properties${qs ? `?${qs}` : ''}`);
}

function apiGetProperty(id) {
  return apiRequest(`/api/properties/${id}`);
}

function apiCreateProperty(payload) {
  return apiRequest('/api/properties', {
    method: 'POST',
    body: payload,
  });
}

function apiUpdateProperty(id, payload) {
  return apiRequest(`/api/properties/${id}`, {
    method: 'PUT',
    body: payload,
  });
}

function apiDeleteProperty(id) {
  return apiRequest(`/api/properties/${id}`, {
    method: 'DELETE',
  });
}

function apiUpdatePropertyStatus(id, status) {
  return apiRequest(`/api/properties/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

function apiGetAgencies() {
  return apiRequest('/api/agencies');
}

function apiCreateAgency(payload) {
  return apiRequest('/api/agencies', {
    method: 'POST',
    body: payload,
  });
}

function apiUpdateAgency(id, payload) {
  return apiRequest(`/api/agencies/${id}`, {
    method: 'PUT',
    body: payload,
  });
}

function apiDeleteAgency(id) {
  return apiRequest(`/api/agencies/${id}`, {
    method: 'DELETE',
  });
}

function apiGetStatsOverview() {
  return apiRequest('/api/stats/overview');
}

function apiLogin(credentials) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: credentials,
  });
}

function apiRegister(payload) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
}

function apiLogout() {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
  });
}

function apiMe() {
  return apiRequest('/api/auth/me');
}

function apiGetUsers() {
  return apiRequest('/api/auth/users');
}

function apiChangeUserRole(id, role) {
  return apiRequest(`/api/auth/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
  });
}

function apiGetFavorites() {
  return apiRequest('/api/favorites');
}

function apiAddFavorite(propertyId) {
  return apiRequest(`/api/favorites/${propertyId}`, {
    method: 'POST',
  });
}

function apiRemoveFavorite(propertyId) {
  return apiRequest(`/api/favorites/${propertyId}`, {
    method: 'DELETE',
  });
}

