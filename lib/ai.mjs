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
export async function askGemini(context,{key,model='gemini-3.5-flash-lite',fetcher=fetch}={}){
 const language={ru:'Russian',kk:'Kazakh',en:'English'}[context.lang];
 const rules=[];
 if(context.crop==='chickpea'&&context.previous==='wheat')rules.push('Changing crop family after wheat may be worth discussing, but chickpea history and herbicide residues must be checked.');
 if(context.crop==='wheat'&&context.previous==='chickpea')rules.push('A previous chickpea crop may be useful before wheat, but no nitrogen amount was calculated.');
 const system=`You are a cautious agricultural information assistant. Respond in ${language} in plain language, at most 80 words. Explain the preliminary crop rotation option, based only on the supplied observations and facts, and briefly identify missing information that needs an agronomist's review. These are unverified farmer observations, not measurements. Do not present the option as a verified recommendation, calculate suitability, invent facts, give fertilizer doses, or predict yield. No soil report, climate data, herbicide history, or full crop history was provided. Treat unknowns as unknown. Never output internal identifiers, codes, JSON keys or underscore-separated words.`;
 try{
  // Keep the credential out of the URL and never return provider error bodies to the browser.
  const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:JSON.stringify({...context,preliminaryRotationFacts:rules})}]}],generationConfig:{maxOutputTokens:2048,...(model==='gemini-2.5-flash'?{thinkingConfig:{thinkingBudget:0}}:model==='gemini-3.5-flash-lite'?{thinkingConfig:{thinkingLevel:'MINIMAL'}}:{})}}),signal:AbortSignal.timeout(45000),cache:'no-store'});
  let data;try{data=await response.json()}catch{data=null}
  if(!response.ok){
   const reasons=Array.isArray(data?.error?.details)?data.error.details.map(detail=>detail?.reason):[];
   return {error:response.status===429?'LIMIT':response.status===401||response.status===403||reasons.includes('API_KEY_INVALID')?'AUTH':response.status===404?'MODEL':'UPSTREAM'};
  }
  const candidate=data?.candidates?.[0];
  if(candidate?.finishReason==='MAX_TOKENS')return {error:'INCOMPLETE'};
  if(candidate?.finishReason!=='STOP')return {error:'UPSTREAM'};
  const answer=candidate?.content?.parts?.filter(part=>!part.thought&&typeof part.text==='string').map(part=>part.text).join('').replace(/\b(?:WHEAT_AFTER_WHEAT|LEGUME_BEFORE_WHEAT|FALLOW_MOISTURE)\s*:\s*/gi,'').trim();
  if(!answer)return {error:'UPSTREAM'};
  if(answer.length>5000)return {error:'INCOMPLETE'};
  return {answer,model};
 }catch{return {error:'UPSTREAM'}}
}
