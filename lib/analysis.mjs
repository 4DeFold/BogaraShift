/** All windows are fixed screening assumptions, not calibrated crop stages. */
export const WINDOWS = {
  spring: { start: 3, end: 5, metric: 'rain' },
  autumn: { start: 9, end: 11, metric: 'rain' },
  springSummer: { start: 4, end: 6, metric: 'rain' },
  grainHeat: { start: 5, end: 6, metric: 'heat' },
};
const round = n => Math.round(n * 10) / 10;
const median = values => { const sorted = [...values].sort((a,b)=>a-b); const m = Math.floor(sorted.length/2); return round(sorted.length % 2 ? sorted[m] : (sorted[m-1]+sorted[m])/2); };
function dateKeys(year,start,end) {
  const keys=[];
  for(let m=start;m<=end;m++) {
    const days = new Date(Date.UTC(year,m,0)).getUTCDate();
    for(let d=1;d<=days;d++) keys.push(`${year}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}`);
  }
  return keys;
}
export function summarizePower(parameters) {
  const windows = {};
  for(const [name, spec] of Object.entries(WINDOWS)) {
    const source = parameters?.[spec.metric === 'rain' ? 'PRECTOTCORR' : 'T2M_MAX'] || {};
    const years=[];
    for(let year=2005;year<=2024;year++) {
      const days=dateKeys(year,spec.start,spec.end);
      if(!days.every(d=>Number.isFinite(source[d]) && (spec.metric==='rain'?source[d]>=0:source[d]>-100))) continue;
      const value=spec.metric==='rain'?round(days.reduce((sum,d)=>sum+source[d],0)):days.filter(d=>source[d]>=30).length;
      years.push({year,value});
    }
    if(!years.length){windows[name]=null;continue;}
    const vals=years.map(y=>y.value), min=Math.min(...vals), max=Math.max(...vals);
    windows[name]={years,median:median(vals),min,max,driest:spec.metric==='rain'?years.filter(y=>y.value===min).map(y=>y.year):[]};
  }
  return Object.values(windows).some(Boolean) ? windows : null;
}

export const CROP_IDS = ['Озимая пшеница','Чистый пар','Нут','Сафлор','Люцерна'];
/** Adjacent pairs only within five years, not the last-to-first cycle boundary. */
export function rotationMetrics(rotation) {
  const count = crop => rotation.filter(c=>c===crop).length;
  const repeatedWheat = rotation.slice(1).filter((c,i)=>c===CROP_IDS[0] && rotation[i]===CROP_IDS[0]).length;
  const predecessor = crop => rotation.slice(1).filter((c,i)=>c===CROP_IDS[0] && rotation[i]===crop).length;
  return {wheat:count(CROP_IDS[0]),legumes:count(CROP_IDS[2])+count(CROP_IDS[4]),fallow:count(CROP_IDS[1]),repeatedWheat,market:[CROP_IDS[2],CROP_IDS[3]].filter(c=>rotation.includes(c)), wheatAfterFallow:predecessor(CROP_IDS[1]),wheatAfterChickpea:predecessor(CROP_IDS[2]),wheatAfterSafflower:predecessor(CROP_IDS[3])};
}
export function matchingRotations(strategies) {
 const pairs=[];
 for(let i=0;i<strategies.length;i++) for(let j=i+1;j<strategies.length;j++) if(strategies[i].rotation.length===strategies[j].rotation.length && strategies[i].rotation.every((c,k)=>c===strategies[j].rotation[k])) pairs.push([strategies[i].id,strategies[j].id]);
 return pairs;
}
/** Different rotations select relevant windows; climate itself is identical for the same point. */
export function relevantWindows(rotation) {
 const present=new Set(rotation), result=[];
 if(present.has(CROP_IDS[0])) result.push({crop:0,window:'autumn'},{crop:0,window:'grainHeat'});
 if(present.has(CROP_IDS[2])) result.push({crop:2,window:'spring'});
 if(present.has(CROP_IDS[3])) result.push({crop:3,window:'springSummer'});
 if(present.has(CROP_IDS[4])) result.push({crop:4,window:'springSummer'});
 return result;
}
