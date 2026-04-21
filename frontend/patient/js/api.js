/* api.js – Healify Patient Panel API Helper */

const BASE_URL = '/api';

const api = {
  token: () => localStorage.getItem('telemind_client_token'),

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },

  async _handle(r) {
    const data = await r.json().catch(() => ({ success: false, message: `HTTP ${r.status}` }));
    if (!r.ok) {
      if (r.status === 401) { localStorage.removeItem('telemind_client_token'); localStorage.removeItem('telemind_client_user'); window.navigate && window.navigate('screen-login'); }
      const err = new Error(data.message || `HTTP ${r.status}`);
      err.status = r.status; err.data = data;
      throw err;
    }
    return data;
  },

  async get(path) {
    const res = await fetch(BASE_URL + path, { headers: this.headers() });
    return this._handle(res);
  },

  async post(path, body) {
    const res = await fetch(BASE_URL + path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    return this._handle(res);
  },

  async put(path, body) {
    const res = await fetch(BASE_URL + path, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
    return this._handle(res);
  },

  async postForm(path, formData) {
    const headers = {};
    if (this.token()) headers['Authorization'] = `Bearer ${this.token()}`;
    const res = await fetch(BASE_URL + path, { method: 'PUT', headers, body: formData });
    return this._handle(res);
  }
};
