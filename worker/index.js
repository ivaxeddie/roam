const json=(obj,status=200,extra={})=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...extra}});
const validBlob=b=>b&&typeof b.iv==='string'&&typeof b.ciphertext==='string'&&b.iv.length<100&&b.ciphertext.length<1000000;
export default {async fetch(req,env){
 const url=new URL(req.url),path=url.pathname,origin=req.headers.get('Origin')||'',allowed=env.ALLOWED_ORIGIN||'';
 const cors=allowed&&origin===allowed?{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'Content-Type,X-Group-Proof','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Vary':'Origin'}:{};
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const respond=(obj,status=200)=>json(obj,status,cors);
 if(allowed&&origin&&origin!==allowed)return respond({error:'Origin not allowed'},403);
 try{
 if(path==='/api/groups'&&req.method==='POST'){
 const b=await req.json();if(!/^[a-z0-9][a-z0-9_-]{2,47}$/.test(b.name||'')||typeof b.salt!=='string'||b.salt.length>100||typeof b.proof!=='string'||b.proof.length>100||!validBlob(b.blob))return respond({error:'Invalid group data'},400);
 try{await env.DB.prepare('INSERT INTO groups (name,salt,proof,blob,revision) VALUES (?,?,?,?,1)').bind(b.name,b.salt,b.proof,JSON.stringify(b.blob)).run();return respond({revision:1},201)}catch{return respond({error:'This group name is already taken'},409)}
 }
 const match=path.match(/^\/api\/groups\/([a-z0-9][a-z0-9_-]{2,47})(\/data)?$/);if(!match)return respond({error:'Not found'},404);
 const name=match[1],row=await env.DB.prepare('SELECT * FROM groups WHERE name=?').bind(name).first();if(!row)return respond({error:'Group not found'},404);
 if(!match[2]&&req.method==='GET')return respond({salt:row.salt});
 const proof=req.headers.get('X-Group-Proof')||'';
 if(proof.length!==row.proof.length||!proof||proof!==row.proof)return respond({error:'Incorrect codeword'},401);
 if(match[2]&&req.method==='GET')return respond({blob:JSON.parse(row.blob),revision:row.revision});
 if(match[2]&&req.method==='PUT'){
 const b=await req.json();if(!Number.isSafeInteger(b.revision)||!validBlob(b.blob))return respond({error:'Invalid update'},400);
 const result=await env.DB.prepare('UPDATE groups SET blob=?,revision=revision+1 WHERE name=? AND revision=?').bind(JSON.stringify(b.blob),name,b.revision).run();if(!result.meta.changes)return respond({error:'Conflict: another member updated the group'},409);
 return respond({revision:b.revision+1});
 }
 return respond({error:'Not found'},404);
 }catch{return respond({error:'Server error'},500)}
 }};
