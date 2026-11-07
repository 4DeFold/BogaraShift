// Only a minimal set of explicitly selected facts leaves the browser. No files, field names,
// coordinates, soil measurements or free text are accepted here.
const choices={crop:['','wheat','chickpea','safflower','alfalfa','fallow'],texture:['unknown','sandy','loamy','clay'],drainage:['unknown','standing','quick'],drying:['unknown','quick','long'],salinity:['unknown','yes','no'],terrain:['unknown','level','slope'],previous:['','wheat','chickpea','safflower','alfalfa','fallow']};
export function validateAiContext(input){
 if(!input||typeof input!=='object'||!['ru','kk','en'].includes(input.lang)||!Number.isInteger(input.year)||input.year<1981||input.year>2100)return null;
 const result={lang:input.lang,year:input.year};
 for(const [k,allowed] of Object.entries(choices)){const value=input[k]??(k==='crop'||k==='previous'?'':'unknown');if(!allowed.includes(value))return null;result[k]=value;}
 return result;
}
export function modelName(value,fallback){return typeof value==='string'&&/^[a-z0-9][a-z0-9.-]{0,59}$/.test(value)?value:fallback;}
export async function askZai(context,{key,model='glm-5.3',fallback='glm-5.2',fetcher=fetch}={}){
 const language={ru:'Russian',kk:'Kazakh',en:'English'}[context.lang];
 const system=`You are a cautious agricultural information assistant. Respond in ${language}. The input is unverified user observations and crop planning choices, not measurements. Explain what is known, what is missing and what to ask an agronomist; avoid prescriptions, fertilizer dosages, yield forecasts or claims that a crop is recommended. No soil report or climate data was provided. Treat unknowns as unknown. Use at most 150 words.`;
 async function request(name){
  const response=await fetcher('https://api.z.ai/api/paas/v4/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:name,messages:[{role:'system',content:system},{role:'user',content:JSON.stringify(context)}],max_tokens:700,thinking:{type:'disabled'},stream:false}),signal:AbortSignal.timeout(25000),cache:'no-store'});
  let data;try{data=await response.json()}catch{return {error:'UPSTREAM'}}
  if(!response.ok)return {error:response.status===429?'LIMIT':String(data?.error?.code)==='1211'?'MODEL':'UPSTREAM'};
  const answer=data?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())return {error:'UPSTREAM'};
  return {answer:answer.trim().slice(0,5000),model:name};
 }
 try{let result=await request(model);if(result.error==='MODEL'&&fallback&&fallback!==model)result=await request(fallback);return result;}catch{return {error:'UPSTREAM'}}
}
