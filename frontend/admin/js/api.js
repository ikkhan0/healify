const BASE_URL='/api';
const api={
  token:()=>localStorage.getItem('healify_admin_token'),
  headers(){const h={'Content-Type':'application/json'};if(this.token())h['Authorization']=`Bearer ${this.token()}`;return h;},
  async get(p){const r=await fetch(BASE_URL+p,{headers:this.headers()});return r.json();},
  async post(p,b){const r=await fetch(BASE_URL+p,{method:'POST',headers:this.headers(),body:JSON.stringify(b)});return r.json();},
  async put(p,b){const r=await fetch(BASE_URL+p,{method:'PUT',headers:this.headers(),body:JSON.stringify(b)});return r.json();},
  async del(p){const r=await fetch(BASE_URL+p,{method:'DELETE',headers:this.headers()});return r.json();}
};
