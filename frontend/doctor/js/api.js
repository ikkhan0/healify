/* api.js – Doctor Panel */
const BASE_URL = '/api';
const api = {
  token: () => localStorage.getItem('telemind_doctor_token'),
  headers() {
    const h = {'Content-Type':'application/json'};
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },
  async _handle(r) {
    const data = await r.json().catch(() => ({ success: false, message: `HTTP ${r.status}` }));
    if (!r.ok) {
      if (r.status === 401) { localStorage.removeItem('telemind_doctor_token'); localStorage.removeItem('telemind_doctor_user'); window.navigate && window.navigate('screen-login'); }
      const err = new Error(data.message || `HTTP ${r.status}`);
      err.status = r.status;
      err.data = data;
      throw err;
    }
    return data;
  },
  async get(path) { const r = await fetch(BASE_URL+path,{headers:this.headers()}); return this._handle(r); },
  async post(path,body) { const r = await fetch(BASE_URL+path,{method:'POST',headers:this.headers(),body:JSON.stringify(body)}); return this._handle(r); },
  async put(path,body) { const r = await fetch(BASE_URL+path,{method:'PUT',headers:this.headers(),body:JSON.stringify(body)}); return this._handle(r); }
};
