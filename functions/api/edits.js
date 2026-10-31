// Cloudflare Pages Function: /api/edits  (lưu chỉnh sửa vào D1)
// Binding D1: DB  |  Secret: EDIT_PASSWORD
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}});
const init=db=>db.prepare('CREATE TABLE IF NOT EXISTS edits (so_kph TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT)').run();

export async function onRequestGet({env}){
  if(!env.DB)return J({status:'error',message:'Chưa gắn D1 binding tên DB'},500);
  await init(env.DB);
  const {results}=await env.DB.prepare('SELECT so_kph, data FROM edits').all();
  const data={};for(const r of results||[]){try{data[r.so_kph]=JSON.parse(r.data)}catch{}}
  return J({status:'success',data});
}

export async function onRequestPost({request,env}){
  if(!env.DB||!env.EDIT_PASSWORD)return J({status:'error',message:'Chưa gắn D1 binding DB hoặc chưa tạo secret EDIT_PASSWORD'},500);
  let b;try{b=await request.json()}catch{return J({status:'error',message:'Dữ liệu không hợp lệ'},400)}
  if(b.password!==env.EDIT_PASSWORD)return J({status:'error',message:'Sai mật khẩu'},401);
  const rows=(Array.isArray(b.rows)?b.rows:[]).filter(r=>r&&r.so_kph);
  if(rows.length){
    await init(env.DB);
    const {results}=await env.DB.prepare('SELECT so_kph, data FROM edits').all();
    const cur={};for(const r of results||[]){try{cur[r.so_kph]=JSON.parse(r.data)}catch{}}
    const now=new Date().toISOString(),st=[];
    for(const r of rows){const k=String(r.so_kph);cur[k]={...(cur[k]||{}),...r,so_kph:k};
      st.push(env.DB.prepare('INSERT INTO edits (so_kph,data,updated_at) VALUES (?1,?2,?3) ON CONFLICT(so_kph) DO UPDATE SET data=?2, updated_at=?3').bind(k,JSON.stringify(cur[k]),now));}
    for(let i=0;i<st.length;i+=50)await env.DB.batch(st.slice(i,i+50));
  }
  return J({status:'success',count:rows.length});
}
