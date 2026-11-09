import {gridKey,climateWindow,climateMetrics,POWER_PARAMS} from '../../../lib/climate.mjs';
// Best-effort per-instance throttle; deployment-wide protection requires a shared limiter/WAF.
const buckets=new Map();
function allow(request){const now=Date.now(),ip=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'local';let bucket=buckets.get(ip);if(!bucket||now-bucket.since>=60000)bucket={since:now,count:0};bucket.count++;buckets.set(ip,bucket);if(buckets.size>600){for(const [key,value] of buckets){if(now-value.since>=60000)buckets.delete(key);}if(buckets.size>600)buckets.delete(buckets.keys().next().value);}return bucket.count<=30;}
export async function GET(request){
 if(!allow(request))return Response.json({error:'RATE_LIMITED'},{status:429,headers:{'Retry-After':'60'}});
 const q=new URL(request.url).searchParams,latText=q.get('lat'),lonText=q.get('lon'),yearText=q.get('year');
 if(!latText||!lonText||!/^\d{4}$/.test(yearText||''))return Response.json({error:'INVALID_INPUT'},{status:400});
 const lat=Number(latText),lon=Number(lonText),year=Number(yearText);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180||year<1981||year>new Date().getUTCFullYear())return Response.json({error:'INVALID_INPUT'},{status:400});
 const window=climateWindow(year);if(!window)return Response.json({error:'NO_DATA_YET'},{status:400});
 const grid=gridKey(lat,lon),url=new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
 for(const [key,value] of Object.entries({parameters:POWER_PARAMS.join(','),community:'AG',latitude:grid.lat,longitude:grid.lon,start:window.start,end:window.end,format:'JSON'}))url.searchParams.set(key,String(value));
 try{
  const response=await fetch(url,{next:{revalidate:86400},signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('upstream');
  const data=await response.json();return Response.json({source:'NASA POWER AG daily',grid,window,metrics:climateMetrics(data,window.start,window.end)},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'POWER_UNAVAILABLE'},{status:502});}
}
