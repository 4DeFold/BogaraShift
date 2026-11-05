import {areaHa,serverAreaHa} from './geometry.mjs';
export const CROP_COLORS={wheat:'#d1b65a',chickpea:'#84b97a',safflower:'#d78864',alfalfa:'#77b6af',fallow:'#a78ca8'};
export function cropColor(crop){return CROP_COLORS[crop]||'#95a0a1';}
export function plannedCrop(field,year,scenario){return field?.seasonPlans?.[String(year)]?.[scenario]?.crop||'';}
export function withCrop(field,year,scenario,crop){return {...field,seasonPlans:{...field.seasonPlans,[year]:{...field.seasonPlans?.[year],[scenario]:{...field.seasonPlans?.[year]?.[scenario],crop}}}};}
export function checks(field,year){const results=[];const previous=field.cropHistory?.[year-1];if(field.displayCrop==='wheat'&&previous==='wheat')results.push('wheatAfterWheat');if(field.displayCrop==='wheat'&&previous==='chickpea')results.push('legumeBeforeWheat');if(field.displayCrop==='fallow')results.push('fallowRisk');if(!field.salinity||field.salinity==='unknown')results.push('riskUnknown');if(!field.buyer?.trim())results.push('buyerUnknown');return results;}
export function csvCell(value){const s=String(value??'');return `"${(/^[\s]*[=+@\-\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')}"`;}
export function withSeasonData(field,year,scenario,patch){return {...field,seasonPlans:{...field.seasonPlans,[year]:{...field.seasonPlans?.[year],[scenario]:{...field.seasonPlans?.[year]?.[scenario],...patch}}}};}
export function occupancyError(field,year,scenario,start,end){
 if(!start&&!end)return null;
 const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;
 if(!isDate(start)||!isDate(end)||start>end)return 'dates';
 for(const [y,plans] of Object.entries(field.seasonPlans||{})){
  if(y===String(year))continue;
  const other=plans?.[scenario];if(other?.crop&&other.occupancyCrop===other.crop&&other.occupancyStart&&other.occupancyEnd&&start<=other.occupancyEnd&&end>=other.occupancyStart)return 'overlap';
 }
 return null;
}
export function economics({yieldLow,yieldBase,yieldHigh,priceLow,priceBase,priceHigh,cost},area){
 const raw=[yieldLow,yieldBase,yieldHigh,priceLow,priceBase,priceHigh,cost];if(raw.some(v=>v===''||v==null))return null;
 const n=raw.map(Number);if(n.some(v=>!Number.isFinite(v)||v<0)||n[0]>n[1]||n[1]>n[2]||n[3]>n[4]||n[4]>n[5])return null;
 const margins=[n[0]*n[3]-n[6],n[1]*n[4]-n[6],n[2]*n[5]-n[6]];
 return {margins,totals:area!=null?margins.map(m=>m*area):null,breakEvenYield:n[4]>0?n[6]/n[4]:null,breakEvenPrice:n[1]>0?n[6]/n[1]:null};
}

// Old selection grid cells are not real field boundaries.
export function planningArea(cell){return cell?.source!=='legacy'&&(cell?.polygon||cell?.geometry)?(serverAreaHa(cell)??areaHa(cell)):null;}
