import { afterEach, expect, it, vi } from 'vitest';
import { GET } from '../app/api/context/route.js';
afterEach(()=>vi.unstubAllGlobals());
it('returns complete windows, exact request URLs and distinct MODIS quality/service states',async()=>{
 const rain={},temp={};
 for(const [month,days] of [[3,31],[4,30],[5,31],[6,30],[9,30],[10,31],[11,30]]) for(let day=1;day<=days;day++) {const key=`2005${String(month).padStart(2,'0')}${String(day).padStart(2,'0')}`;rain[key]=1;temp[key]=31;}
 vi.stubGlobal('fetch',vi.fn(async url=>{
  const text=String(url);
  if(text.includes('power.larc')) return {ok:true,json:async()=>({properties:{parameter:{PRECTOTCORR:rain,T2M_MAX:temp}}})};
  if(text.includes('MOD13Q1')) return {ok:true,json:async()=>({subset:[]})};
  throw new Error('offline');
 }));
 const result=await GET(new Request('http://localhost/api/context?lat=42.4&lon=69.85'));const json=await result.json();
 expect(json.power.spring.median).toBe(92);expect(json.power.autumn.median).toBe(91);expect(json.power.grainHeat.median).toBe(61);
 expect(json.statuses).toEqual({power:'ok',ndvi:'no_quality',et:'unavailable'});
 expect(json.provenance.urls.power).toContain('latitude=42.4');expect(json.provenance.urls.ndvi).toContain('startDate=A2025121');expect(json.provenance.retrievedAt).toBeTruthy();
});
it('rejects coordinates outside the region before making any external request',async()=>{
 vi.stubGlobal('fetch',vi.fn()); const response=await GET(new Request('http://localhost/api/context?lat=20&lon=69'));expect(response.status).toBe(400);expect(fetch).not.toHaveBeenCalled();
});

it('selects a later same-date ET/PET pair when the first ET has no PET',async()=>{
 const item=(band,modis_date,value)=>({band,modis_date,calendar_date:modis_date,data:[value]});
 const subset=[item('ET_500m','A2025121',10),item('ET_QC_500m','A2025121',0),item('ET_500m','A2025129',20),item('PET_500m','A2025129',30),item('ET_QC_500m','A2025129',0)];
 vi.stubGlobal('fetch',vi.fn(async url=>({ok:true,json:async()=>String(url).includes('MOD16A2GF')?{subset}:{}})));
 const json=await (await GET(new Request('http://localhost/api/context?lat=42.4&lon=69.85'))).json();
 expect(json.statuses.et).toBe('ok');expect(json.et.value).toBe(2);expect(json.pet.value).toBe(3);expect(json.et.modisDate).toBe(json.pet.modisDate);
});
