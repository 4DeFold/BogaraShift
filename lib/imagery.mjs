export const LAYERS={s30:'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',l30:'HLS_L30_Nadir_BRDF_Adjusted_Reflectance'};
export function tileUrl(sensor,date,z,y,x){if(!LAYERS[sensor]||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('Invalid imagery');return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LAYERS[sensor]}/default/${date}/GoogleMapsCompatible_Level12/${z}/${y}/${x}.png`;}
// CMR contains granules, not proof of a rendered pixel. Deduplicate days and check GIBS separately.
export function candidatesFromFeeds(feeds,now=new Date()){
 const end=now.getTime(),start=end-90*86400000,days=new Map();
 for(const sensor of ['s30','l30']){
  const entries=feeds[sensor]?.feed?.entry;if(!Array.isArray(entries))throw Error('Invalid CMR response');
  for(const e of entries){const time=Date.parse(e.time_start);if(!Number.isFinite(time)||time> end||time<start)continue;const date=new Date(time).toISOString().slice(0,10),key=`${sensor}:${date}`;if(!days.has(key)||time>days.get(key).time)days.set(key,{sensor,date,time});}
 }
 return [...days.values()].sort((a,b)=>b.time-a.time||a.sensor.localeCompare(b.sensor)).slice(0,30);
}
export function tilePoint(lat,lon,z=12){
 const clamped=Math.max(-85.05112878,Math.min(85.05112878,lat)),wrapped=((lon+180)%360+360)%360-180,n=2**z;
 const x=(wrapped+180)/360*n,y=(1-Math.asinh(Math.tan(clamped*Math.PI/180))/Math.PI)/2*n;
 const tx=Math.floor(x),ty=Math.max(0,Math.min(n-1,Math.floor(y)));
 return {z,x:tx,y:ty,px:Math.max(0,Math.min(255,Math.floor((x-tx)*256))),py:Math.max(0,Math.min(255,Math.floor((y-ty)*256)))};
}
export async function findLatestHls(lat,lon,{signal,fetcher=fetch,probe,now=new Date()}={}){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85.05112878)throw Error('Invalid position');
 const start=new Date(now.getTime()-90*86400000).toISOString(),end=now.toISOString();
 const feeds=await Promise.all(['s30','l30'].map(async sensor=>{
  const q=new URLSearchParams({short_name:sensor==='s30'?'HLSS30':'HLSL30',version:'2.0',point:`${((lon+180)%360+360)%360-180},${lat}`,temporal:`${start},${end}`,page_size:'100',sort_key:'-start_date'});
  const response=await fetcher(`https://cmr.earthdata.nasa.gov/search/granules.json?${q}`,{signal});if(!response.ok)throw Error('CMR unavailable');return response.json();
 }));
 const candidates=candidatesFromFeeds({s30:feeds[0],l30:feeds[1]},now),tile=tilePoint(lat,lon);
 for(const candidate of candidates){if(signal?.aborted)throw new DOMException('Aborted','AbortError');const present=await probe(tileUrl(candidate.sensor,candidate.date,tile.z,tile.y,tile.x),tile,signal);if(present)return candidate;}
 return null;
}
