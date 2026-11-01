import { ComparisonTable } from './Comparison';
export default function Report({strategies,t,x,power,field,lat,lon,priorityIndex,lang,provenance,prepared}) {
 const format=n=>new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(n);
 const spring=power?.spring;
 const seq=s=>s.rotation.map(c=>t.cropShort[['Озимая пшеница','Чистый пар','Нут','Сафлор','Люцерна'].indexOf(c)]).join(' → ');
 return <article className="print-report" aria-label={x.report}>
  <header className="report-head"><div><strong>BogaraShift</strong><h1>{x.report}</h1></div><div>{x.reportDate}: {prepared}<br/>{x.point}: {lat}°, {lon}°</div></header>
  <p className="report-field"><b>{field}</b> · {t.priorityPrefix} {t.priorities[priorityIndex]}</p>
  <div className="report-rotations">{strategies.map(s=><p key={s.id}><b>{s.id} · {s.title}:</b> {seq(s)}</p>)}</div>
  <ComparisonTable strategies={strategies} t={t} x={x} power={power} locale={lang} priorityIndex={priorityIndex} print/>
  <p><b>NASA POWER:</b> {spring ? `${t.rain}: ${format(spring.min)}–${format(spring.max)} ${x.mm}; ${x.climateMedian}: ${format(spring.median)} ${x.mm}; ${x.dryYear}: ${spring.driest.join(', ')}.` : t.noData} {x.reportContext}</p>
  <p>{x.reportUnknown}</p><div className="report-questions"><b>{x.reportQuestions}</b><ol>{strategies.map(s=><li key={s.id}><b>{s.id}:</b> {s.question}</li>)}</ol></div>
  <p className="report-sources"><b>{x.reportSources}:</b> NASA POWER (power.larc.nasa.gov), MODIS / ORNL (modis.ornl.gov), Сыдык и др. (2010), стр. 6: slideshare.net/slideshow/ss-7483007/7483007#6. {x.retrieved}: {provenance?.retrievedAt || '—'}.</p>
 </article>;
}
