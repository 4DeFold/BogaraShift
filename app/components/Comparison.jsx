import { matchingRotations, relevantWindows, rotationMetrics, CROP_IDS } from '../../lib/analysis.mjs';

const keyFor = ({crop,window}) => window === 'autumn' ? 'winAutumn' : window === 'grainHeat' ? 'winHeat' : window === 'spring' ? 'winSpring' : crop === 3 ? 'winSummerSaff' : 'winSummerAlf';
export function windowLines(rotation,power,x,locale) {
 return relevantWindows(rotation).map(item=>{
   const w=power?.[item.window]; const label=x[keyFor(item)];
   if(!w) return {label,value:'—'};
   return {label,value:`${x.climateMedian} ${new Intl.NumberFormat(locale,{maximumFractionDigits:1}).format(w.median)} ${item.window==='grainHeat'?x.days:x.mm} · ${w.years.length} ${x.seasons}`};
 });
}
function getRows(strategies,t,x,power,locale) {
 const metrics=strategies.map(s=>rotationMetrics(s.rotation));
 return [
  {key:'wheat',label:x.wheat,values:metrics.map(m=>m.wheat)},
  {key:'legumes',label:x.legumes,values:metrics.map(m=>m.legumes)},
  {key:'fallow',label:x.fallow,values:metrics.map(m=>m.fallow)},
  {key:'repeat',label:x.repeat,values:metrics.map(m=>m.repeatedWheat)},
  {key:'market',label:x.market,values:metrics.map(m=>m.market.length?m.market.map(c=>t.cropShort[CROP_IDS.indexOf(c)]).join(', '):x.none)},
  {key:'predecessor',label:x.predecessor,values:metrics.map(m=>`${m.wheatAfterFallow} / ${m.wheatAfterChickpea} / ${m.wheatAfterSafflower}`)},
  {key:'climate',label:x.climate,values:strategies.map(s=>windowLines(s.rotation,power,x,locale))}
 ];
}
const priorityRows=[['fallow','predecessor','climate'],['fallow','legumes'],['market']];
export function ComparisonTable({strategies,t,x,power,locale,priorityIndex,print=false}) {
 const rows=getRows(strategies,t,x,power,locale);
 const matches=matchingRotations(strategies);
 return <div className={print?'report-comparison':'comparison-summary'}>
  {!print && <><div className="comparison-summary-head"><h3>{x.tableTitle}</h3><p>{x.tableLead}</p></div><div className="priority-focus"><strong>{x.priorityTitles[priorityIndex]}</strong><span>{x.priorityExplainers[priorityIndex]}</span></div></>}
  {matches.map(([a,b])=><p className="match-note" key={a+b}>{x.same(a,b)}</p>)}
  <div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th scope="col">{x.indicator}</th>{strategies.map(s=><th key={s.id} scope="col">{s.id} · {s.title}</th>)}</tr></thead><tbody>{rows.map(row=><tr className={priorityRows[priorityIndex].includes(row.key)?'focus-row':''} key={row.key}><th scope="row">{row.label}</th>{row.values.map((v,i)=><td key={strategies[i].id}>{Array.isArray(v)?v.length?v.map((line,j)=><div className="window-line" key={j}><span>{line.label}</span><strong>{line.value}</strong></div>):x.notApplicable:v}</td>)}</tr>)}</tbody></table></div>
  {!print && <><p className="comparison-note">{x.tableNote}</p><div className="weather-explainer"><strong>{x.weatherProof}</strong><p>{x.weatherProofText}</p><p>{x.climateIntro}</p><p>{x.calendarNote}</p></div></>}
 </div>;
}
