'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CircleHelp, CloudRain, Droplets, ExternalLink, Leaf, LocateFixed, MapPin, Menu, Pencil, Satellite, ShieldAlert, Sprout, Sun, Wheat, X } from 'lucide-react';
import { messages } from '../lib/i18n';
import { extra } from '../lib/comparison-i18n';
import { ComparisonTable } from './components/Comparison';
import Report from './components/Report';

// Stable storage values remain language-independent for backwards compatibility.
const crops = ['Озимая пшеница','Чистый пар','Нут','Сафлор','Люцерна'];
const classes = ['wheat','fallow','chickpea','safflower','alfalfa'];
const priorities = ['Сохранить влагу','Защитить почву','Снизить рыночный риск'];
const urls = ['https://power.larc.nasa.gov/docs/methodology/','https://modis.ornl.gov/data/modis_webservice.html','https://www.fao.org/4/x0490e/x0490e0b.htm','https://cyberleninka.ru/article/n/puti-povysheniya-urozhaynosti-ozimoy-pshenitsy-na-bogarnyh-zemlyah-yugo-vostoka-kazahstana','https://24.kz/ru/news/social/645280-v-kazakhstane-snizilsya-spros-na-saflorovoe-maslo'];
const defaultField = 'Поле в предгорьях';
function CropIcon({crop}) { return crop === crops[0] ? <Wheat size={17}/> : crop === crops[1] ? <span className="fallow-icon">≋</span> : <Sprout size={17}/>; }
function HelpButton({name, title, selected, onToggle, more}) {return <button type="button" className="help-button" aria-label={`${more}: ${title}`} aria-expanded={selected} aria-controls={selected?'data-help':undefined} onClick={()=>onToggle(name)}><CircleHelp size={15}/></button>}
function App() {
 const [rotation,setRotation] = useState(Array(5).fill(crops[0]));
 const [priority,setPriority] = useState(priorities[0]);
 const [lat,setLat] = useState('42.4'); const [lon,setLon] = useState('69.85');
 const [field,setField] = useState(defaultField);
 const [lang,setLang] = useState('ru'); const [ready,setReady] = useState(false);
 const [modal,setModal] = useState(false); const [draft,setDraft] = useState(null);
 const [data,setData] = useState(null); const [status,setStatus] = useState('loading'); const [error,setError] = useState(false);
 const [active,setActive] = useState('C'); const [mobile,setMobile] = useState(false);
 const [help,setHelp] = useState(null); const [showHistory,setShowHistory] = useState(false);
 const [navActive,setNavActive] = useState('overview');
 const requestRef = useRef(null); const modalRef = useRef(null);
 const t = messages[lang]; const x=extra[lang];
 const detailRef=useRef(null);
 const format = value => new Intl.NumberFormat(lang, {maximumFractionDigits:1}).format(value);
 const spring=data?.power?.spring; const heat=data?.power?.grainHeat;
 const unitDays = n => lang==='ru' ? (!Number.isInteger(n) ? 'дня / сезон' : n%10===1 && n%100!==11 ? 'день / сезон' : n%10>=2 && n%10<=4 && !(n%100>=12 && n%100<=14) ? 'дня / сезон' : 'дней / сезон') : t.daysSeason;
 const satelliteStatus = key => data?.statuses?.[key]==='unavailable' ? x.serviceUnavailable : data?.statuses?.[key]==='no_quality' ? x.noQuality : '';
 const fieldDisplay = field === defaultField ? t.defaultField : field === 'Моё поле' ? t.myField : field;
 const priorityIndex = Math.max(0, priorities.indexOf(priority));
 useEffect(() => {
   try {
     const savedLang = localStorage.getItem('bogara-language');
     if (Object.hasOwn(messages, savedLang)) setLang(savedLang);
     const saved=JSON.parse(localStorage.getItem('bogara-field'));
     if(saved && Array.isArray(saved.rotation) && saved.rotation.length===5 && saved.rotation.every(c=>crops.includes(c))) {
       setRotation(saved.rotation); setField(saved.field || defaultField); setLat(String(saved.lat || '42.4')); setLon(String(saved.lon || '69.85')); setPriority(priorities.includes(saved.priority)?saved.priority:priorities[0]);
     }
   } catch {} finally {setReady(true);}
 }, []);
 useEffect(()=>{document.documentElement.lang=lang;},[lang]);
 function changeLanguage(value) {setLang(value);try {localStorage.setItem('bogara-language',value)} catch {}}
 useEffect(() => {
   const observer = new IntersectionObserver(entries => {for (const entry of entries) if (entry.isIntersecting) setNavActive(entry.target.id);}, {rootMargin:'-15% 0px -70% 0px'});
   for (const id of ['overview','data','compare']) {const el=document.getElementById(id);if(el)observer.observe(el);}
   return () => observer.disconnect();
 }, []);
 useEffect(() => {
   if (!modal) return;
   const previous=document.activeElement; const timer=setTimeout(()=>modalRef.current?.querySelector('input')?.focus(),0);
   const onKey=event=>{if(event.key==='Escape')setModal(false);if(event.key!=='Tab'||!modalRef.current)return;const focusable=[...modalRef.current.querySelectorAll('button, input, select, a[href]')].filter(el=>!el.disabled);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}};
   document.addEventListener('keydown',onKey);return ()=>{clearTimeout(timer);document.removeEventListener('keydown',onKey);previous?.focus?.();};
 },[modal]);
 useEffect(() => {
   if (!ready) return;
   const controller = new AbortController(); requestRef.current = controller;
   setStatus('loading');setData(null);setShowHistory(false);
   (async()=>{try {
     const res=await fetch(`/api/context?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,{signal:controller.signal});
     const result=await res.json();if(!res.ok)throw new Error('Data unavailable');
     if(requestRef.current!==controller || controller.signal.aborted)return;
     setData(result);setStatus('done');
   } catch(err){if(err.name!=='AbortError' && requestRef.current===controller && !controller.signal.aborted){setData(null);setStatus('failed');}}})();
   return ()=>{controller.abort();if(requestRef.current===controller)requestRef.current=null;};
 },[ready,lat,lon]);
 function openSettings(){setDraft({field,lat,lon,rotation:[...rotation],priority});setError(false);setModal(true);}
 function saveDraft(){
   const a=Number(draft.lat),b=Number(draft.lon);
   if(!draft.lat.trim()||!draft.lon.trim()||!Number.isFinite(a)||!Number.isFinite(b)||a<40||a>44||b<67||b>72){setError(true);return;}
   const coordsChanged = draft.lat !== lat || draft.lon !== lon;
   if(coordsChanged){requestRef.current?.abort();requestRef.current=null;setData(null);setStatus('loading');setShowHistory(false);}
   setHelp(null);setRotation(draft.rotation);setLat(draft.lat);setLon(draft.lon);setField(draft.field.trim()||'Моё поле');setPriority(draft.priority);setError(false);setModal(false);
   try{localStorage.setItem('bogara-field',JSON.stringify({...draft,field:draft.field.trim()||'Моё поле'}));}catch{}
 }
 const helpText={rain:[t.rain,x.historyNote],heat:[x.heatWindow,x.heatText],ndvi:[t.ndvi,t.ndviHelp],water:[t.water,t.waterHelp]};
 const currentWheat=rotation.filter(c=>c===crops[0]).length;
 const strategies=t.strategy.map((s,i)=>({...s,id:['A','B','C'][i],rotation:i===0?rotation:i===1?[crops[1],crops[0],crops[3],crops[0],crops[4]]:[crops[2],crops[0],crops[3],crops[0],crops[4]],benefits:i===0?(currentWheat===5?s.benefitWheat:s.benefitOther):s.benefit,risk:i===0?(currentWheat===5?s.riskWheat:s.riskOther):s.risk}));
 for(const other of strategies.slice(1)) if(strategies[0].rotation.every((crop,i)=>crop===other.rotation[i])) {for(const key of ['benefits','risk','gap','question']) strategies[0][key]=other[key];break;}
 const selected=strategies.find(s=>s.id===active);
 const partial = status==='failed' || (status==='done' && (!spring || !heat || !data?.ndvi || !data?.et || !data?.pet));
 const stat = status==='loading' ? t.loading : partial ? t.unavailable : t.loaded;
 return <>
 <div className="app-shell"><header className="header"><div className="header-inner"><a href="#top" className="brand"><img className="brand-logo" src="/logo.png" alt=""/><span>Bogara<span>Shift</span></span></a><nav id="main-navigation" aria-label={t.nav} className={mobile?'nav open':'nav'}><a href="#overview" aria-current={navActive==='overview'?'location':undefined} onClick={()=>{setMobile(false);setNavActive('overview')}}>{t.overview}</a><a href="#compare" aria-current={navActive==='compare'?'location':undefined} onClick={()=>{setMobile(false);setNavActive('compare')}}>{t.compare}</a><a href="#data" aria-current={navActive==='data'?'location':undefined} onClick={()=>{setMobile(false);setNavActive('data')}}>{t.methodology}</a></nav><div className="header-right"><span className="header-region"><MapPin size={15}/> {t.region}</span><label className="language-select"><span className="sr-only">{t.language}</span><select aria-label={t.language} value={lang} onChange={e=>changeLanguage(e.target.value)}><option value="ru">RU</option><option value="kk">ҚАЗ</option><option value="en">EN</option></select></label><button className="menu" onClick={()=>setMobile(!mobile)} aria-label={mobile?t.closeMenu:t.openMenu} aria-expanded={mobile} aria-controls="main-navigation">{mobile?<X/>:<Menu/>}</button></div></div></header>
 <main id="top"><div className="page-wrap">
 <section className="hero"><div className="hero-copy"><div className="eyebrow light"><span className="dot"/> {t.heroTag}</div><h1>{t.hero1}<br/><em>{t.hero2}</em></h1><p>{t.heroDesc}</p><a className="hero-button" href="#compare">{t.compareAction} <ArrowRight size={19}/></a></div><div className="hero-caption"><span>{t.dryland}</span><b>{t.south}</b><small>{t.illustration}</small></div></section><div className="mission-strip"><div><span>{t.regionLabel}</span><strong>{t.foothills}</strong></div><div><span>{t.comparison}</span><strong>{t.strategies}</strong></div><div><span>{t.horizon}</span><strong>{t.fiveYears}</strong></div><a href="#overview">{t.start} <ArrowDownRight size={19}/></a></div>
 <div className="intro-row" id="overview"><div><div className="section-kicker"><span>01</span> {t.yourField}</div><h2>{t.fieldHeading}</h2><p>{t.fieldDesc}</p></div><button className="outline-button" onClick={openSettings}><Pencil size={15}/> {t.configure}</button></div>
 <section className="field-card"><div className="field-main"><div className="field-icon"><MapPin size={21}/></div><div><div className="field-top"><h3>{fieldDisplay}</h3><span className="tag">{t.dry}</span></div><p>{t.region} · {lat}° {t.north}, {lon}° {t.east}</p></div></div><div className="field-stat"><span>{t.currentRotation}</span><strong>{currentWheat===5?t.wheatFive:t.ownRotation}</strong><small>{t.example}</small></div><div className="field-stat priority"><span>{t.yourPriority}</span><strong>{t.priorities[priorityIndex]}</strong><small>{t.discuss}</small></div><button className="field-edit" aria-label={t.configure} onClick={openSettings}><ArrowUpRight size={19}/></button></section>
 <section className="context" id="data"><div className="section-heading"><div><div className="section-kicker"><span>02</span> {t.historyLabel}</div><h2>{t.dataHeading}</h2><p>{t.dataDesc}</p></div><div className="data-status" role="status" aria-live="polite"><Satellite size={17}/> {stat}</div></div>
 <div className="data-grid"><div className="data-card"><div className="data-label"><span className="data-icon blue"><CloudRain size={17}/></span> {t.rain.toLocaleUpperCase(lang)} <HelpButton name="rain" title={t.rain} more={t.more} selected={help==='rain'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{spring ? `${format(spring.median)} ${x.mm}` : '—'} <small>{spring?t.median:t.noData}</small></div><p>NASA POWER · 2005–2024</p>{spring && <div className="rain-range">{x.range}: <b>{format(spring.min)}–{format(spring.max)} {x.mm}</b><br/>{x.dryYear}: <b>{spring.driest.join(', ')} · {format(spring.min)} {x.mm}</b><br/>{spring.years.length} {x.seasons}</div>}<div className="data-foot"><span className="foot-dot"/> {t.powerSpring}</div></div><div className="data-card"><div className="data-label"><span className="data-icon gold"><Sun size={17}/></span> {x.heatWindow.toLocaleUpperCase(lang)} <HelpButton name="heat" title={x.heatWindow} more={t.more} selected={help==='heat'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{heat ? format(heat.median) : '—'} <small>{heat?unitDays(heat.median):t.noData}</small></div><p>{x.heatText}{heat ? ` · ${heat.years.length} ${x.seasons}` : ''}</p><div className="data-foot"><span className="foot-dot"/> {t.historyNotForecast}</div></div><div className="data-card"><div className="data-label"><span className="data-icon green"><Leaf size={17}/></span> {t.ndvi.toLocaleUpperCase(lang)} <HelpButton name="ndvi" title={t.ndvi} more={t.more} selected={help==='ndvi'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{data?.ndvi?.value ?? '—'} <small>{data?.ndvi?'NDVI':t.noData}</small></div><p>{data?.ndvi ? `${t.firstComposite} · ${data.ndvi.date}` : t.windowNdvi}</p><div className="data-foot"><span className="foot-dot"/> {t.mixedPixel}</div><div className="observation-note">{x.observed}</div>{satelliteStatus('ndvi') && <div className="data-status-message">{satelliteStatus('ndvi')}</div>}</div><div className="data-card"><div className="data-label"><span className="data-icon teal"><Droplets size={17}/></span> {t.water.toLocaleUpperCase(lang)} <HelpButton name="water" title={t.water} more={t.more} selected={help==='water'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{data?.et ? `${format(data.et.value)} ${x.mm}` : '—'} <small>{data?.et?'ET / '+(lang==='en'?'composite':'композит'):t.noData}</small></div><p>{data?.pet ? `PET ${format(data.pet.value)} ${x.mm} · ${data.pet.date}` : t.windowEt}</p><div className="data-foot"><span className="foot-dot"/> {t.noIrrigation}</div><div className="observation-note">{x.observed}</div>{satelliteStatus('et') && <div className="data-status-message">{satelliteStatus('et')}</div>}</div></div>
 {help && <div className="help-panel" id="data-help" role="region" aria-label={helpText[help][0]}><div><strong>{helpText[help][0]}</strong><p>{helpText[help][1]}</p></div><button type="button" onClick={()=>setHelp(null)} aria-label={t.closeHelp}><X size={16}/></button></div>}
 {spring && <div className="history"><button className="history-toggle" type="button" onClick={()=>setShowHistory(!showHistory)} aria-expanded={showHistory} aria-controls={showHistory?'history-table':undefined}>{showHistory?t.hideHistory:t.showHistory} <ArrowRight size={15}/></button>{showHistory && <div id="history-table" className="history-table-wrap"><p>{x.historyNote}</p><div className="history-bars" aria-hidden="true">{spring.years.map(y=><div className="history-bar" key={y.year} style={{height:`${Math.max(2, y.value / Math.max(spring.max,1)*100)}%`}} title={`${y.year}: ${format(y.value)} ${x.mm}`}><span>{y.year}</span></div>)}</div><div className="history-axis"><span>{spring.years[0].year}</span><span>{spring.years[spring.years.length-1].year}</span></div><table><thead><tr><th>{t.year}</th><th>{x.histRain}</th></tr></thead><tbody>{spring.years.map(y=><tr key={y.year}><td>{y.year}</td><td>{format(y.value)}</td></tr>)}</tbody></table></div>}</div>}
 {status==='failed' && <div className="notice"><ShieldAlert size={17}/> {x.serviceUnavailable}</div>}
 {status==='done' && !spring && <div className="notice"><ShieldAlert size={17}/> POWER: {x.powerMissing}</div>}
 <div className="data-note"><Satellite size={17}/><p><strong>{t.readData}</strong> {t.dataCaution}</p><a href="#sources">{t.aboutSources} <ArrowRight size={14}/></a></div>
 <details className="data-provenance"><summary>{x.details}</summary><p><strong>{x.point}:</strong> {lat}°, {lon}° · <strong>{x.retrieved}:</strong> {data?.provenance?.retrievedAt || '—'}</p><p>{x.powerSource} {data?.provenance?.urls?.power && <a href={data.provenance.urls.power} target="_blank" rel="noreferrer">{x.api} ↗</a>}</p><p>{x.ndviSource} {data?.ndvi && ` · ${data.ndvi.date} · ${x.quality}: ${data.ndvi.quality} · raw: ${data.ndvi.raw}`} {satelliteStatus('ndvi')} {data?.provenance?.urls?.ndvi && <a href={data.provenance.urls.ndvi} target="_blank" rel="noreferrer">{x.api} ↗</a>}</p><p>{x.etSource} {data?.et && ` · ${data.et.date} · ${x.quality}: ${data.et.quality} · ET raw: ${data.et.raw}${data.pet ? ` · PET raw: ${data.pet.raw}` : ''}`} {satelliteStatus('et')} {data?.provenance?.urls?.et && <a href={data.provenance.urls.et} target="_blank" rel="noreferrer">{x.api} ↗</a>}</p><p>{x.localSource} <a href="https://www.slideshare.net/slideshow/ss-7483007/7483007#6" target="_blank" rel="noreferrer">{x.sourceLink} ↗</a></p></details></section>
 <section className="comparison" id="compare"><div className="section-heading compare-heading"><div><div className="section-kicker"><span>03</span> {t.compareLabel}</div><h2>{t.threePaths}</h2><p>{t.compareDesc}</p></div><div className="horizon"><span>{t.compareHorizon}</span><strong>{t.fiveYears}</strong></div></div>
 <div className="strategy-grid">{strategies.map(s=><button key={s.id} className={`strategy-card ${active===s.id?'selected':''}`} onClick={()=>{setActive(s.id);if(window.matchMedia?.('(max-width: 760px)').matches) requestAnimationFrame(()=>detailRef.current?.scrollIntoView?.({behavior:'smooth',block:'start'}));}} aria-pressed={active===s.id}><div className="strategy-top"><span className="letter">{s.id}</span><span className="strategy-eyebrow">{s.eyebrow}</span>{active===s.id && <span className="selected-mark"><Check size={13}/></span>}</div><h3>{s.title}</h3><p>{s.desc}</p><div className="rotation-title">{t.sequence}</div><div className="rotation">{s.rotation.map((crop,i)=><div className="year" key={i}><span>{String(i+1).padStart(2,'0')}</span><div className={`crop-icon ${classes[crops.indexOf(crop)]}`}><CropIcon crop={crop}/></div><small>{t.cropShort[crops.indexOf(crop)]}</small></div>)}</div><div className="card-bottom">{active===s.id?t.selected:t.explore} <ArrowRight size={15}/></div></button>)}</div>
 <ComparisonTable strategies={strategies} t={t} x={x} power={data?.power} locale={lang} priorityIndex={priorityIndex}/>
 <div className="detail-panel" ref={detailRef} tabIndex={-1}><div className="detail-title"><div><div className="detail-eyebrow">{t.strategyDetails(selected.id)}</div><h3>{selected.title}</h3><p>{t.detailDesc}</p></div><span className="detail-badge"><Sprout size={15}/> {t.rotationFive}</span></div><div className="detail-grid"><div><span className="detail-label benefit"><Check size={14}/> {t.benefit}</span><p>{selected.benefits}</p></div><div><span className="detail-label risk"><ShieldAlert size={14}/> {t.risk}</span><p>{selected.risk}</p></div><div><span className="detail-label gap"><CircleHelp size={14}/> {t.unknown}</span><p>{selected.gap}</p></div></div><div className="question"><span><b>{t.agronomist}</b> {selected.question}</span><ArrowUpRight size={17}/></div></div>
 <div className="priority-note"><span className="priority-icon"><Droplets size={18}/></span><p><strong>{t.priorityPrefix} {t.priorities[priorityIndex]}.</strong> {t.priorityNotes[priorityIndex]}</p><button onClick={openSettings}>{t.change} <ArrowRight size={14}/></button></div></section>
 <section className="closing"><div><div className="section-kicker"><span>04</span> {t.next}</div><h2>{t.closing1}<br/>{t.closing2}</h2><p>{t.closingDesc}</p></div><button onClick={()=>window.print()}>{t.print} <ArrowDownRight size={17}/></button></section>
 <footer id="sources"><div className="footer-top"><div><a href="#top" className="brand footer-brand"><img className="brand-logo" src="/logo.png" alt=""/><span>Bogara<span>Shift</span></span></a><p>{t.footer1}<br/>{t.footer2}</p></div><div className="sources"><span>{t.sources}</span><div>{urls.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer" title={t.sourceDesc[i]}>{t.sourceTitles[i]} <ExternalLink size={12}/></a>)}<a href="https://www.slideshare.net/slideshow/ss-7483007/7483007#6" target="_blank" rel="noreferrer">{x.sourceLink} <ExternalLink size={12}/></a></div></div></div><div className="footer-bottom"><span>© 2026 BOGARASHIFT · INNISTELLAR</span><span>{t.disclaimer}</span></div></footer>
 </div></main>
 {modal && draft && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><div className="section-kicker"><span>{t.setup}</span> {t.yourField}</div><h2 id="modal-title">{t.tellField}</h2><p>{t.localOnly}</p></div><button className="close" onClick={()=>setModal(false)} aria-label={t.close}><X size={20}/></button></div><div className="form-grid"><label className="full">{t.fieldName}<input value={draft.field===defaultField?t.defaultField:draft.field==='Моё поле'?t.myField:draft.field} maxLength={60} onChange={e=>setDraft({...draft,field:e.target.value})}/></label><label>{t.latitude}<input type="number" step="0.01" value={draft.lat} onChange={e=>setDraft({...draft,lat:e.target.value})}/></label><label>{t.longitude}<input type="number" step="0.01" value={draft.lon} onChange={e=>setDraft({...draft,lon:e.target.value})}/></label><p className="form-hint full"><LocateFixed size={14}/> {t.coordsHint}</p><label className="full" htmlFor="field-priority">{t.priority}<select id="field-priority" value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{priorities.map((p,i)=><option key={p} value={p}>{t.priorities[i]}</option>)}</select></label><div className="full rotation-form"><strong>{t.currentFive}</strong><p>{t.rotationHint}</p>{draft.rotation.map((crop,i)=><label key={i} htmlFor={`rotation-${i}`}><span>{t.yearNumber(i+1)}</span><select id={`rotation-${i}`} value={crop} onChange={e=>{const r=[...draft.rotation];r[i]=e.target.value;setDraft({...draft,rotation:r})}}>{crops.map((c,j)=><option key={c} value={c}>{t.crops[j]}</option>)}</select></label>)}</div>{error && <p className="form-error full" role="alert">{t.validation}</p>}</div><div className="modal-actions"><button className="outline-button" onClick={()=>setModal(false)}>{t.cancel}</button><button className="primary-button" onClick={saveDraft}>{t.save} <ArrowRight size={16}/></button></div></div></div>}
 </div><Report strategies={strategies} t={t} x={x} power={data?.power} field={fieldDisplay} lat={lat} lon={lon} priorityIndex={priorityIndex} lang={lang} provenance={data?.provenance} prepared={ready?new Intl.DateTimeFormat(lang).format(new Date()):'—'}/>
 </>;
}
export default App;
