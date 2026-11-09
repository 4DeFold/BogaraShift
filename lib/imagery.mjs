export const LAYERS={s30:'HLS_S30_Nadir_BRDF_Adjusted_Reflectance',l30:'HLS_L30_Nadir_BRDF_Adjusted_Reflectance'};
export function tileUrl(sensor,date,z,y,x){if(!LAYERS[sensor]||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))throw Error('Invalid imagery');return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${LAYERS[sensor]}/default/${date}/GoogleMapsCompatible_Level12/${z}/${y}/${x}.png`;}
// CMR cloud percentages describe entire granules, not individual map pixels.
export function candidatesFromFeeds(feeds){
 const start=Date.parse('2025-01-01T00:00:00Z'),end=Date.parse('2026-01-01T00:00:00Z'),days=new Map();
 for(const sensor of ['s30','l30']){
  const entries=feeds[sensor]?.feed?.entry;if(!Array.isArray(entries))throw Error('Invalid CMR response');
  for(const e of entries){
   const time=Date.parse(e.time_start),value=e.cloud_cover;
   if((typeof value!=='string'&&typeof value!=='number')||String(value).trim()==='')continue;
   const cloud=Number(value);if(!Number.isFinite(time)||time<start||time>=end||!Number.isFinite(cloud)||cloud<0||cloud>10)continue;
   const date=new Date(time).toISOString().slice(0,10),key=`${sensor}:${date}`,season=date>='2025-05-01'&&date<='2025-09-30';
   const prior=days.get(key);if(!prior||cloud<prior.cloud||(cloud===prior.cloud&&time>prior.time))days.set(key,{sensor,date,time,cloud,season});
  }
 }
 // Prefer the lowest scene cloud estimate, then the agricultural season and latest date.
 return [...days.values()].sort((a,b)=>a.cloud-b.cloud||Number(b.season)-Number(a.season)||b.time-a.time||a.sensor.localeCompare(b.sensor)).slice(0,30);
}
export function tilePoint(lat,lon,z=12){
 const clamped=Math.max(-85.05112878,Math.min(85.05112878,lat)),wrapped=((lon+180)%360+360)%360-180,n=2**z;
 const x=(wrapped+180)/360*n,y=(1-Math.asinh(Math.tan(clamped*Math.PI/180))/Math.PI)/2*n;
 const tx=Math.floor(x),ty=Math.max(0,Math.min(n-1,Math.floor(y)));
 return {z,x:tx,y:ty,px:Math.max(0,Math.min(255,Math.floor((x-tx)*256))),py:Math.max(0,Math.min(255,Math.floor((y-ty)*256)))};
}
export async function findHls2025(lat,lon,{signal,fetcher=fetch,probe}={}){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85.05112878)throw Error('Invalid position');
 const start='2025-01-01T00:00:00Z',end='2025-12-31T23:59:59Z';
 const feeds=await Promise.all(['s30','l30'].map(async sensor=>{
  const q=new URLSearchParams({short_name:sensor==='s30'?'HLSS30':'HLSL30',version:'2.0',point:`${((lon+180)%360+360)%360-180},${lat}`,temporal:`${start},${end}`,cloud_cover:'0,10',page_size:'100',sort_key:'-start_date'});
  const response=await fetcher(`https://cmr.earthdata.nasa.gov/search/granules.json?${q}`,{signal});if(!response.ok)throw Error('CMR unavailable');return response.json();
 }));
 const candidates=candidatesFromFeeds({s30:feeds[0],l30:feeds[1]}),tile=tilePoint(lat,lon);
 for(const candidate of candidates){if(signal?.aborted)throw new DOMException('Aborted','AbortError');const present=await probe(tileUrl(candidate.sensor,candidate.date,tile.z,tile.y,tile.x),tile,signal);if(present)return candidate;}
 return null;
}
