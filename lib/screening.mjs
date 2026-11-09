import {checks} from './dashboard.mjs';
import {CROPS} from './plan.mjs';
// Preliminary comparison only: no suitability score, yield prediction or automatic assignment.
// Every flag comes from an explicit observation or a transparent rule in checks().
export function screenScenarios(field,year){
 const missing=[];
 if(!field?.cropHistory?.[year-1])missing.push('missingHistory');
 if(['texture','drainage','drying','salinity','terrain'].some(k=>!field?.[k]||field[k]==='unknown'))missing.push('missingObservations');
 if(!field?.report)missing.push('missingReport');else missing.push('reportNotRead');
 if(!field?.cell||field.cell.boundaryStatus!=='confirmed')missing.push('missingBoundary');
 if(!field?.buyer?.trim())missing.push('missingBuyer');
 missing.push('climateNotUsed');
 return {missing,alternatives:CROPS.map(crop=>({crop,flags:checks({...field,displayCrop:crop},year)}))};
}
