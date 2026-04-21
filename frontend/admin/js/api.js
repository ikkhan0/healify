const BASE_URL='/api';
const api={
  token:()=>localStorage.getItem('telemind_admin_token'),
  headers(){const h={'Content-Type':'application/json'};if(this.token())h['Authorization']=`Bearer ${this.token()}`;return h;},
  async _handle(r){
    const data=await r.json().catch(()=>({success:false,message:`HTTP ${r.status}`}));
    if(!r.ok){if(r.status===401){localStorage.removeItem('telemind_admin_token');window.location.reload();}const err=new Error(data.message||`HTTP ${r.status}`);err.status=r.status;err.data=data;throw err;}
    return data;
  },
  async get(p){const r=await fetch(BASE_URL+p,{headers:this.headers()});return this._handle(r);},
  async post(p,b){const r=await fetch(BASE_URL+p,{method:'POST',headers:this.headers(),body:JSON.stringify(b)});return this._handle(r);},
  async put(p,b){const r=await fetch(BASE_URL+p,{method:'PUT',headers:this.headers(),body:JSON.stringify(b)});return this._handle(r);},
  async del(p){const r=await fetch(BASE_URL+p,{method:'DELETE',headers:this.headers()});return this._handle(r);}
};
