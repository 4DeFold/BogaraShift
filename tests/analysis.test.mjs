import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePower,rotationMetrics,relevantWindows,matchingRotations,CROP_IDS} from '../lib/analysis.mjs';
import {modisValue,modisStatus} from '../lib/modis.mjs';
function series() {
 const rain={},temp={};
 for(const y of [2005,2006]) for(const [m,n] of [[3,31],[4,30],[5,31],[6,30],[9,30],[10,31],[11,30]]) for(let d=1;d<=n;d++){const k=`${y}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}`;rain[k]=y===2005?1:2;temp[k]=y===2005?31:29;}
 return {PRECTOTCORR:rain,T2M_MAX:temp};
}
test('windows use exact dates, independently exclude missing values and calculate medians',()=>{
 const data=series(); data.PRECTOTCORR['20060301']=-999; data.T2M_MAX['20060601']=-999;
 const r=summarizePower(data);
 assert.equal(r.spring.years.length,1);assert.equal(r.spring.median,92);assert.equal(r.spring.min,92);assert.deepEqual(r.spring.driest,[2005]);
 assert.equal(r.autumn.years.length,2);assert.equal(r.autumn.median,136.5);
 assert.equal(r.springSummer.years.length,2);assert.equal(r.springSummer.median,136.5);
 assert.equal(r.grainHeat.years.length,1);assert.equal(r.grainHeat.median,61);
});
test('empty input has no summary',()=>assert.equal(summarizePower({}),null));
test('rotation metrics count adjacent pairs without wrapping and compare exact sequences',()=>{
 const [w,f,c,s,a]=CROP_IDS; const r=[w,w,c,s,a];
 assert.deepEqual(rotationMetrics(r),{wheat:2,legumes:2,fallow:0,repeatedWheat:1,market:[c,s],wheatAfterFallow:0,wheatAfterChickpea:0,wheatAfterSafflower:0});
 assert.equal(rotationMetrics([w,f,f,f,w]).repeatedWheat,0);
 assert.deepEqual(matchingRotations([{id:'A',rotation:r},{id:'B',rotation:[...r]},{id:'C',rotation:[w,c,w,s,a]}]),[['A','B']]);
 assert.deepEqual(relevantWindows([f,f,f,f,f]),[]);
 assert.deepEqual(relevantWindows([c,w,s,w,a]).map(w=>w.window),['autumn','grainHeat','spring','springSummer','springSummer']);
});
test('MODIS requires a valid value and matching quality record for the same date',()=>{
 const b=(band,day,value)=>({band,modis_date:day,calendar_date:day,data:[value]});
 const json={subset:[b('NDVI','A2025121',3882),b('QC','A2025137',0),b('NDVI','A2025137',3301),b('QC','A2025121',1)]};
 const v=modisValue(json,'NDVI',0.0001,'QC',-2000,10000);
 assert.equal(v.value,0.3301);assert.equal(v.modisDate,'A2025137');assert.equal(v.raw,3301);
 assert.equal(modisStatus({status:'fulfilled',value:json},null),'no_quality');
 assert.equal(modisStatus({status:'rejected',reason:'error'},null),'unavailable');
 assert.equal(modisStatus({status:'fulfilled',value:{error:'server error'}},null),'unavailable');
});
