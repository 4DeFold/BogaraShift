import { summarizePower } from '../../../lib/analysis.mjs';
import { modisValue, modisStatus } from '../../../lib/modis.mjs';
export const dynamic = 'force-dynamic';
async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(18000), cache:'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
export async function GET(request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat')), lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 40 || lat > 44 || lon < 67 || lon > 72) return Response.json({error:'Invalid coordinates'}, {status:400});
  const power = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  power.search = new URLSearchParams({parameters:'T2M_MAX,PRECTOTCORR',community:'AG',longitude:String(lon),latitude:String(lat),start:'20050101',end:'20241231',format:'JSON'}).toString();
  const modis = product => {const u=new URL(`https://modis.ornl.gov/rst/api/v1/${product}/subset`);u.search=new URLSearchParams({latitude:String(lat),longitude:String(lon),startDate:'A2025121',endDate:'A2025153',kmAboveBelow:'0',kmLeftRight:'0'}).toString();return u;};
  const ndviUrl=modis('MOD13Q1'), etUrl=modis('MOD16A2GF');
  const [p,n,e]=await Promise.allSettled([getJson(power),getJson(ndviUrl),getJson(etUrl)]);
  const powerData=p.status==='fulfilled'?summarizePower(p.value?.properties?.parameter):null;
  const ndvi=n.status==='fulfilled'?modisValue(n.value,'250m 16 days NDVI',0.0001,'250m 16 days pixel reliability',-2000,10000):null;
  // Find the first composite for which both ET and PET pass the same-date QC.
  let et=null, pet=null;
  if(e.status==='fulfilled') {
    const dates=[...new Set((Array.isArray(e.value?.subset) ? e.value.subset : []).map(item=>item.modis_date).filter(Boolean))].sort();
    for(const date of dates) {
      const candidateEt=modisValue(e.value,'ET_500m',0.1,'ET_QC_500m',0,32760,date);
      const candidatePet=modisValue(e.value,'PET_500m',0.1,'ET_QC_500m',0,32760,date);
      if(candidateEt && candidatePet) {et=candidateEt;pet=candidatePet;break;}
    }
  }
  return Response.json({coords:{lat,lon}, power:powerData,ndvi,et,pet,
    statuses:{power:p.status==='rejected'?'unavailable':powerData?'ok':'no_quality',ndvi:modisStatus(n,ndvi),et:modisStatus(e,et&&pet)},
    provenance:{retrievedAt:new Date().toISOString(),urls:{power:power.toString(),ndvi:ndviUrl.toString(),et:etUrl.toString()}}});
}
