import {createClient} from '@supabase/supabase-js';
import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';
import {askZai,modelName,validateAiContext} from '../../../lib/ai.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Best-effort cooldown; the shared daily database quota remains authoritative across instances.
let cooldownUntil=0;
export async function POST(request){
 const noStore={'Cache-Control':'no-store'};
 const reply=(error,status)=>Response.json({error},{status,headers:noStore});
 const key=process.env.ZAI_API_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!key||!url||!pub)return reply('NOT_CONFIGURED',503);
 if(Number(request.headers.get('content-length')||0)>4096)return reply('INVALID_INPUT',400);
 let body;try{const reader=request.body?.getReader();if(!reader)throw Error();const chunks=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4096){await reader.cancel();throw Error();}chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply('INVALID_INPUT',400)}
 const context=validateAiContext(body);if(!context)return reply('INVALID_INPUT',400);
 // Vercel's proxy header is used only as a rate-limit bucket; no raw address is stored.
 // Missing proxy IPs share one conservative bucket. The secret is never sent to the DB.
 const rawAddress=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'';
 const candidate=rawAddress.length<=128?rawAddress.toLowerCase():'';
 const version=isIP(candidate);let clientAddress='unknown';
 if(version===4)clientAddress=candidate;else if(version===6){const mapped=candidate.startsWith('::ffff:')?candidate.slice(7):'';try{clientAddress=isIP(mapped)===4?mapped:new URL(`http://[${candidate}]/`).hostname;}catch{/* Invalid URL forms share the conservative bucket. */}}
 const subjectHash=createHmac('sha256',key).update(clientAddress).digest('hex');
 const client=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  if(Date.now()<cooldownUntil)return reply('PROVIDER_LIMIT',429);
  // Fail closed when the shared quota migration is missing or the database is unavailable.
  const quota=await client.rpc('consume_public_ai_quota',{p_subject_hash:subjectHash});if(quota.error)return reply('QUOTA_UNAVAILABLE',503);if(quota.data!==true)return reply('DAILY_LIMIT',429);
  const result=await askZai(context,{key,model:modelName(process.env.ZAI_MODEL,'glm-5.3'),fallback:modelName(process.env.ZAI_FALLBACK_MODEL,'glm-5.2')});
  if(result.error==='LIMIT'){cooldownUntil=Date.now()+60000;return reply('PROVIDER_LIMIT',429)}
  if(result.error==='AUTH')return reply('PROVIDER_AUTH',502);
  if(result.error==='MODEL')return reply('MODEL_UNAVAILABLE',502);
  if(result.error==='INCOMPLETE')return reply('INCOMPLETE',502);
  if(result.error)return reply('PROVIDER_UNAVAILABLE',502);
  return Response.json(result,{headers:noStore});
 }catch{return reply('SERVICE_UNAVAILABLE',503)}
}
