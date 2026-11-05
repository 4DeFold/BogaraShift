export const POWER_PARAMS=['PRECTOTCORR','T2M_MAX'];
export function gridKey(lat,lon){return {lat:Math.round(lat*2)/2,lon:Math.round(lon/0.625)*0.625};}
export function climateWindow(year,now=new Date()){
 const last=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-7));
 const end=new Date(Date.UTC(year,11,31)),start=new Date(Date.UTC(year,0,1));
 if(start>last)return null;
 return {start:`${year}0101`,end:(end<last?end:last).toISOString().slice(0,10).replaceAll('-','')};
}
export function climateMetrics(data,start,end){
 const params=data?.properties?.parameter,precip=params?.PRECTOTCORR,temp=params?.T2M_MAX;
 if(!precip||!temp||typeof precip!=='object'||typeof temp!=='object')throw Error('invalid POWER response');
 const from=new Date(Date.UTC(+start.slice(0,4),+start.slice(4,6)-1,+start.slice(6,8))),to=new Date(Date.UTC(+end.slice(0,4),+end.slice(4,6)-1,+end.slice(6,8)));
 let total=0,rainDays=0,hot=0,tempDays=0,run=0,dry=0,days=0;
 for(let d=from;d<=to;d=new Date(d.getTime()+86400000)){
  const key=d.toISOString().slice(0,10).replaceAll('-',''),r=precip[key],t=temp[key];days++;
  if(typeof r==='number'&&Number.isFinite(r)&&r>=0){total+=r;rainDays++;run=r<1?run+1:0;dry=Math.max(dry,run);}else run=0;
  if(typeof t==='number'&&Number.isFinite(t)&&t!==-999){tempDays++;if(t>=30)hot++;}
 }
 return {days,rainDays,tempDays,precipMm:rainDays?Math.round(total*10)/10:null,hotDays:tempDays?hot:null,dryDays:rainDays?dry:null};
}
