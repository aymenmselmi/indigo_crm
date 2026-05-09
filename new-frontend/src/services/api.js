const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function req(method, path, body) {
  const token = localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = `${res.status} ${res.statusText}`;
    try {
      const json = JSON.parse(text);
      if (json.message) msg = Array.isArray(json.message) ? json.message[0] : json.message;
    } catch {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  // Auth
  login:    (email, password) => req('POST', '/auth/login', { email, password }),
  register: (data)            => req('POST', '/auth/register', data),
  me:       ()                => req('POST', '/auth/me'),

  // Invitations
  invite:          (email, role = 'user') => req('POST', '/auth/invite', { email, role }),
  listInvitations: ()                     => req('GET', '/auth/invitations'),
  revokeInvitation:(id)                   => req('DELETE', `/auth/invitations/${id}`),
  checkInvite:     (token)                => req('GET', `/auth/check-invite/${token}`),
  acceptInvite:    (token, data)          => req('POST', `/auth/accept-invite/${token}`, data),

  // Members
  listMembers: () => req('GET', '/auth/members'),

  // Accounts
  getAccounts:            (limit = 50) => req('GET', `/accounts?limit=${limit}`),
  createAccount:          (data)       => req('POST', '/accounts', data),
  updateAccount:          (id, data)   => req('PUT', `/accounts/${id}`, data),
  deleteAccount:          (id)         => req('DELETE', `/accounts/${id}`),
  getAccountOpportunities:(id)         => req('GET', `/accounts/${id}/opportunities`),
  getAccountContacts:     (id)         => req('GET', `/accounts/${id}/contacts`),

  // Contacts
  getContacts:   (limit = 50) => req('GET', `/contacts?limit=${limit}`),
  createContact: (data)       => req('POST', '/contacts', data),
  updateContact: (id, data)   => req('PUT', `/contacts/${id}`, data),
  deleteContact: (id)         => req('DELETE', `/contacts/${id}`),

  // Leads
  getLeads:   (limit = 50) => req('GET', `/leads?limit=${limit}`),
  createLead: (data)       => req('POST', '/leads', data),
  updateLead: (id, data)   => req('PUT', `/leads/${id}`, data),
  deleteLead: (id)         => req('DELETE', `/leads/${id}`),
  convertLead:(id)         => req('POST', `/leads/${id}/convert`),

  // Opportunities
  getOpportunities:        (limit = 100) => req('GET', `/opportunities?limit=${limit}`),
  createOpportunity:       (data)        => req('POST', '/opportunities', data),
  updateOpportunity:       (id, data)    => req('PUT', `/opportunities/${id}`, data),
  deleteOpportunity:       (id)          => req('DELETE', `/opportunities/${id}`),
  getOpportunityActivities:(id)          => req('GET', `/opportunities/${id}/activities`),

  // Activities
  getActivities:  (limit = 30) => req('GET', `/activities?limit=${limit}`),
  createActivity: (data)       => req('POST', '/activities', data),
  updateActivity: (id, data)   => req('PUT', `/activities/${id}`, data),
  deleteActivity: (id)         => req('DELETE', `/activities/${id}`),

  // Back office (super_admin only)
  adminStats:          ()           => req('GET', '/admin/stats'),
  adminListOrgs:       ()           => req('GET', '/admin/organizations'),
  adminGetOrg:         (id)         => req('GET', `/admin/organizations/${id}`),
  adminUpdateOrg:      (id, data)   => req('PATCH', `/admin/organizations/${id}`, data),
  adminListUsers:      (search)     => req('GET', `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminUpdateUser:     (id, data)   => req('PATCH', `/admin/users/${id}`, data),

  // Tasks
  getMyTasks: ()           => req('GET', '/api/tasks/my-tasks'),
  getTasks:   (limit = 50) => req('GET', `/api/tasks?limit=${limit}`),
  createTask: (data)       => req('POST', '/api/tasks', data),
  updateTask: (id, data)   => req('PUT', `/api/tasks/${id}`, data),
  deleteTask: (id)         => req('DELETE', `/api/tasks/${id}`),
};

export function unwrap(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.data)) return res.data;
  return [];
}
