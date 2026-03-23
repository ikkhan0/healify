/* api.js – Healify Patient Panel API Helper */

const BASE_URL = '/api';

const api = {
  token: () => localStorage.getItem('healify_token'),

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },

  async get(path) {
    const res = await fetch(BASE_URL + path, { headers: this.headers() });
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(BASE_URL + path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    return res.json();
  },

  async put(path, body) {
    const res = await fetch(BASE_URL + path, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
    return res.json();
  },

  async postForm(path, formData) {
    const headers = {};
    if (this.token()) headers['Authorization'] = `Bearer ${this.token()}`;
    const res = await fetch(BASE_URL + path, { method: 'PUT', headers, body: formData });
    return res.json();
  }
};
