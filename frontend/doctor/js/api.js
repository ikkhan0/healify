/* api.js – Doctor Panel */
const BASE_URL = '/api';
const api = {
  token: () => localStorage.getItem('telemind_doctor_token'),
  headers() {
    const h = {'Content-Type':'application/json'};
    if (this.token()) h['Authorization'] = `Bearer ${this.token()}`;
    return h;
  },
  async get(path) { const r = await fetch(BASE_URL+path,{headers:this.headers()}); return r.json(); },
  async post(path,body) { const r = await fetch(BASE_URL+path,{method:'POST',headers:this.headers(),body:JSON.stringify(body)}); return r.json(); },
  async put(path,body) { const r = await fetch(BASE_URL+path,{method:'PUT',headers:this.headers(),body:JSON.stringify(body)}); return r.json(); }
};
