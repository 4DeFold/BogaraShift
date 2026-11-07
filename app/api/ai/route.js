import {createClient} from '@supabase/supabase-js';
import {askZai,modelName,validateAiContext} from '../../../lib/ai.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Short per-instance cooldown protects against repeatedly hitting an exhausted provider.
// It is not a global quota; the database RPC below is the authoritative shared cap.
let cooldownUntil=0;
export async function POST(request){
 const noStore={'Cache-Control':'no-store'};
 const reply=(error,status)=>Response.json({error},{status,headers:noStore});
 const key=process.env.ZAI_API_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!key||!url||!pub)return reply('NOT_CONFIGURED',503);
 const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]{1,4096})$/)?.[1];if(!token)return reply('AUTH_REQUIRED',401);
 if(Number(request.headers.get('content-length')||0)>4096)return reply('INVALID_INPUT',400);
 let raw,body;try{raw=await request.text();if(raw.length>4096)throw Error();body=JSON.parse(raw)}catch{return reply('INVALID_INPUT',400)}
 const context=validateAiContext(body);if(!context)return reply('INVALID_INPUT',400);
 const client=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 try{
  const {data,error}=await client.auth.getUser(token);if(error||!data?.user)return reply('AUTH_REQUIRED',401);
  if(Date.now()<cooldownUntil)return reply('PROVIDER_LIMIT',429);
  // If the migration is missing or database unavailable, fail closed: never make a paid call.
  const quota=await client.rpc('consume_ai_quota');if(quota.error)return reply('QUOTA_UNAVAILABLE',503);if(quota.data!==true)return reply('DAILY_LIMIT',429);
  const result=await askZai(context,{key,model:modelName(process.env.ZAI_MODEL,'glm-5.3'),fallback:modelName(process.env.ZAI_FALLBACK_MODEL,'glm-5.2')});
  if(result.error==='LIMIT'){cooldownUntil=Date.now()+60000;return reply('PROVIDER_LIMIT',429)}
  if(result.error)return reply('PROVIDER_UNAVAILABLE',502);
  return Response.json(result,{headers:noStore});
 }catch{return reply('SERVICE_UNAVAILABLE',503)}
}
