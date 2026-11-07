'use client';
import {demoText} from '../../lib/demo-text.js';
export function DemoLab({field,lang}){
 const t=demoText[lang],lab=field.report?.synthetic&&field.report?.lab;if(!lab||typeof lab!=='object')return null;const num=(v,n)=>Number.isFinite(v)?v.toFixed(n):'—';
 return <section className="demo-lab"><h3>{t.lab} · {lab.year}</h3><p>{t.labHint}</p><div className="detail-stats">{[[t.ph,num(lab.ph,1)],[t.organic,`${num(lab.organic,1)} %`],[t.nitrate,`${num(lab.nitrate,0)} mg/kg`],[t.phosphorus,`${num(lab.phosphorus,0)} mg/kg`],[t.potassium,`${num(lab.potassium,0)} mg/kg`],[t.ec,`${num(lab.ec,2)} dS/m`]].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><a href={field.report.data} download={field.report.name}>{t.reportName}</a></section>;
}
export function DemoClimate({lang}){const t=demoText[lang];return <section className="detail-section"><h3>{t.climate}</h3><p>{t.climateText}</p></section>}
export function DemoAi({lang}){const t=demoText[lang];return <section className="ai-placeholder"><div><div className="ai-label">DEMO / NOT AI</div><h3>{t.ai}</h3><p>{t.aiText}</p></div></section>}
