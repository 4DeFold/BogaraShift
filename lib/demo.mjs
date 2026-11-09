// Invented examples for a UI demonstration. These are not field boundaries or laboratory measurements.
export const DEMO_STORAGE='bogarashift-demo-fields-v1';
export const DEMO_LANGUAGE='bogarashift-demo-language-v1';
const crops=['wheat','chickpea','safflower','alfalfa','wheat','chickpea','fallow','safflower','wheat','alfalfa'];
const previous=['chickpea','wheat','wheat','fallow','safflower','wheat','wheat','chickpea','fallow','wheat'];
export function demoFields(year=new Date().getFullYear()){
 return Array.from({length:10},(_,i)=>{
  const row=Math.floor(i/5),col=i%5,south=42.391+row*.006,west=69.831+col*.007,lat=south+.002,lon=west+.0025,crop=crops[i];
  const lab={year:year-1,ph:7.1+i*.08,organic:1.4+i*.12,nitrate:8+i,phosphorus:12+i*2,potassium:170+i*13,ec:0.25+i*.04};
  const reportText=`DEMONSTRATION ONLY — INVENTED DATA\nField ${String(i+1).padStart(2,'0')}\npH: ${lab.ph.toFixed(1)}\nOrganic matter: ${lab.organic.toFixed(1)} %\nNitrate: ${lab.nitrate} mg/kg\nPhosphorus: ${lab.phosphorus} mg/kg\nPotassium: ${lab.potassium} mg/kg\nElectrical conductivity: ${lab.ec.toFixed(2)} dS/m\nThis is not a laboratory report and must not be used for agronomic decisions.\n`;
  return {name:`Demo ${String(i+1).padStart(2,'0')}`,cell:{id:`demo-${i+1}`,lat,lon,polygon:[[south,west],[south,west+.005],[south+.004,west+.005],[south+.004,west]],source:'manual',boundaryStatus:'draft',imageDate:'2025-05-25',sensor:'s30'},texture:i%3===0?'clay':i%3===1?'loamy':'sandy',drainage:i%3===0?'standing':'quick',drying:i%2?'quick':'long',salinity:i%4===0?'yes':'no',terrain:i%3===0?'slope':'level',moisture:String(16+i),moistureDate:`${year-1}-04-15`,moistureDepth:'20',yieldHistory:`${year-1}: ${(1.2+i*.1).toFixed(1)} t/ha`,equipment:'Demo',buyer:'Demo',report:{name:`demo-analysis-${String(i+1).padStart(2,'0')}.txt`,data:`data:text/plain;charset=utf-8,${encodeURIComponent(reportText)}`,crop:crop==='fallow'?'wheat':crop,synthetic:true,lab},cropHistory:{[year-1]:previous[i]},seasonPlans:{[year]:{A:{crop,occupancyCrop:crop,occupancyStart:`${year}-03-15`,occupancyEnd:`${year}-09-30`,economicCrop:crop,economics:{yieldLow:'1.1',yieldBase:'1.6',yieldHigh:'2.0',priceLow:'75000',priceBase:'90000',priceHigh:'105000',cost:'70000'}}}}};
 });
}
