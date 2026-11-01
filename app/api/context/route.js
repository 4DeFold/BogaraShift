import { summarizePower } from '../../../lib/analysis.mjs';

export const dynamic = 'force-dynamic';
async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(18000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
function modisValue(json, name, scale, qualityName, maxValue) {
  const normalize = value => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const subset = Array.isArray(json?.subset) ? json.subset : [];
  const item = subset.find(x => {
    if (normalize(x.band) !== normalize(name) || !Array.isArray(x.data) || !Number.isFinite(x.data[0]) || x.data[0] < 0 || x.data[0] > maxValue) return false;
    // Only accept explicitly good-quality pixels from the same composite.
    const qc = subset.find(q => normalize(q.band) === normalize(qualityName) && q.modis_date === x.modis_date);
    return qc?.data?.[0] === 0;
  });
  if (!item) return null;
  return { value: Math.round(item.data[0] * scale * 10000) / 10000, date: item.calendar_date || item.modis_date };
}
export async function GET(request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat')), lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 40 || lat > 44 || lon < 67 || lon > 72) return Response.json({error:'Координаты должны быть в пределах региона: 40–44° с.ш., 67–72° в.д.'}, {status:400});
  const power = new URL('https://power.larc.nasa.gov/api/temporal/daily/point');
  power.search = new URLSearchParams({parameters:'T2M_MAX,PRECTOTCORR',community:'AG',longitude:String(lon),latitude:String(lat),start:'20050101',end:'20241231',format:'JSON'}).toString();
  const modis = product => { const u = new URL(`https://modis.ornl.gov/rst/api/v1/${product}/subset`); u.search = new URLSearchParams({latitude:String(lat),longitude:String(lon),startDate:'A2025121',endDate:'A2025153',kmAboveBelow:'0',kmLeftRight:'0'}).toString(); return u; };
  const [p,n,e] = await Promise.allSettled([getJson(power),getJson(modis('MOD13Q1')),getJson(modis('MOD16A2GF'))]);
  return Response.json({coords:{lat,lon}, power:p.status === 'fulfilled' ? summarizePower(p.value?.properties?.parameter) : null, ndvi:n.status === 'fulfilled' ? modisValue(n.value,'250m 16 days NDVI',0.0001,'250m 16 days pixel reliability',10000) : null, et:e.status === 'fulfilled' ? modisValue(e.value,'ET_500m',0.1,'ET_QC_500m',32760) : null, pet:e.status === 'fulfilled' ? modisValue(e.value,'PET_500m',0.1,'ET_QC_500m',32760) : null, errors:{power:p.status === 'rejected',ndvi:n.status === 'rejected',et:e.status === 'rejected'}});
}
