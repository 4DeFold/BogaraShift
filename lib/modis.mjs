const normalize = value => (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
/** Require valid data and explicit QC=0 on the same dated composite. */
export function modisValue(json, name, scale, qualityName, minValue, maxValue, date) {
 const subset=Array.isArray(json?.subset)?json.subset:[];
 const item=subset.find(x=> {
   if(normalize(x.band)!==normalize(name)||!x.modis_date || (date && x.modis_date!==date)||!Array.isArray(x.data)||!Number.isFinite(x.data[0])||x.data[0]<minValue||x.data[0]>maxValue)return false;
   const qc=subset.find(q=>normalize(q.band)===normalize(qualityName)&&q.modis_date===x.modis_date);
   return qc?.data?.[0]===0;
 });
 if(!item)return null;
 return {value:Math.round(item.data[0]*scale*10000)/10000,date:item.calendar_date||item.modis_date,modisDate:item.modis_date,quality:0,raw:item.data[0]};
}
export function modisStatus(settled, value) {
 if(settled.status==='rejected') return 'unavailable';
 const body=settled.value;
 if(value) return 'ok';
 if(Array.isArray(body?.subset) || /no data|no.*(pixel|coverage)/i.test(JSON.stringify(body))) return 'no_quality';
 return 'unavailable';
}
