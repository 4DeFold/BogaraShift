// Early, deliberately narrow rotation screening, not a validated regional suitability model.
// Refuse to choose when known constraints or insufficient history make a proposed rotation unsafe.
export function suggestCrop(field,year){
 const history=field?.cropHistory||{},previous=history[year-1]||'';
 if(!previous)return {crop:'',reason:'missingHistory'};
 if(field?.salinity==='yes'||field?.drainage==='standing')return {crop:'',reason:'constraint'};
 if(previous==='wheat'){
  if([year-2,year-3].some(y=>history[y]==='chickpea'))return {crop:'',reason:'recentChickpea'};
  return {crop:'chickpea',reason:'afterWheat'};
 }
 if(previous==='chickpea')return {crop:'wheat',reason:'afterChickpea'};
 return {crop:'',reason:'unsupportedHistory'};
}
