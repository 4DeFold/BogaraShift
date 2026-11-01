'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, CircleHelp, CloudRain, Droplets, ExternalLink, Leaf, LocateFixed, MapPin, Menu, Pencil, Satellite, ShieldAlert, Sprout, Sun, Wheat, X } from 'lucide-react';

const crops = ['Озимая пшеница','Чистый пар','Нут','Сафлор','Люцерна'];
const short = {'Озимая пшеница':'Пшеница','Чистый пар':'Чистый пар','Нут':'Нут','Сафлор':'Сафлор','Люцерна':'Люцерна'};
const classes = {'Озимая пшеница':'wheat','Чистый пар':'fallow','Нут':'chickpea','Сафлор':'safflower','Люцерна':'alfalfa'};
const priorities = ['Сохранить влагу','Защитить почву','Снизить рыночный риск'];
const sources = [
 ['NASA POWER','Исторические погода и осадки','https://power.larc.nasa.gov/docs/methodology/'],
 ['MODIS / ORNL','Зелёность и водный контекст','https://modis.ornl.gov/data/modis_webservice.html'],
 ['FAO-56','Методические ограничения','https://www.fao.org/4/x0490e/x0490e0b.htm'],
 ['Локальная агрономия','Предшественники пшеницы на богаре','https://cyberleninka.ru/article/n/puti-povysheniya-urozhaynosti-ozimoy-pshenitsy-na-bogarnyh-zemlyah-yugo-vostoka-kazahstana'],
 ['Рынок сафлора','Риски сбыта в регионе','https://24.kz/ru/news/social/645280-v-kazakhstane-snizilsya-spros-na-saflorovoe-maslo']
];
function CropIcon({crop}) { return crop === 'Озимая пшеница' ? <Wheat size={17}/> : crop === 'Чистый пар' ? <span className="fallow-icon">≋</span> : <Sprout size={17}/>; }
function HelpButton({name, title, selected, onToggle}) {return <button type="button" className="help-button" aria-label={`Подробнее: ${title}`} aria-expanded={selected} aria-controls="data-help" onClick={()=>onToggle(name)}><CircleHelp size={15}/></button>}
function App() {
 const [rotation,setRotation] = useState(Array(5).fill('Озимая пшеница'));
 const [priority,setPriority] = useState('Сохранить влагу');
 const [lat,setLat] = useState('42.4'); const [lon,setLon] = useState('69.85');
 const [field,setField] = useState('Поле в предгорьях');
 const [modal,setModal] = useState(false); const [draft,setDraft] = useState(null);
 const [data,setData] = useState(null); const [status,setStatus] = useState('idle'); const [error,setError] = useState('');
 const [active,setActive] = useState('C'); const [mobile,setMobile] = useState(false);
 const [help,setHelp] = useState(null); const [showHistory,setShowHistory] = useState(false);
 const [navActive,setNavActive] = useState('overview');
 const requestRef = useRef(null); const modalRef = useRef(null);
 useEffect(() => {
   const observer = new IntersectionObserver(entries => {
     for (const entry of entries) if (entry.isIntersecting) setNavActive(entry.target.id);
   }, {rootMargin: '-15% 0px -70% 0px'});
   for (const id of ['overview','data','compare']) { const el = document.getElementById(id); if(el) observer.observe(el); }
   return () => observer.disconnect();
 }, []);
 useEffect(() => {
   if (!modal) return;
   const previous = document.activeElement;
   const timer = setTimeout(() => modalRef.current?.querySelector('input')?.focus(), 0);
   const onKey = event => {
     if (event.key === 'Escape') setModal(false);
     if (event.key !== 'Tab' || !modalRef.current) return;
     const focusable = [...modalRef.current.querySelectorAll('button, input, select, a[href]')].filter(el => !el.disabled);
     if (!focusable.length) return;
     const first = focusable[0], last = focusable[focusable.length - 1];
     if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
     else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
   };
   document.addEventListener('keydown', onKey);
   return () => {clearTimeout(timer);document.removeEventListener('keydown', onKey);previous?.focus?.();};
 }, [modal]);
 useEffect(() => () => requestRef.current?.abort(), []);
 function openSettings() {setDraft({field,lat,lon,rotation:[...rotation],priority});setError('');setModal(true);}
 const helpText = {
   rain: ['Осадки весной', 'Сумма осадков за март–май для каждого полного года 2005–2024. Медиана и число лет строго ниже неё описывают историю модельной ячейки POWER, а не прогноз для поля.'],
   heat: ['Жаркие дни', 'Число дней марта–мая с максимальной температурой не ниже 30 °C. Показана медиана полных сезонов NASA POWER; порог — простой индикатор, а не диагноз стресса культуры.'],
   ndvi: ['Зелёность NDVI', 'MOD13Q1: первый пиксель хорошего качества в окне мая 2025, масштаб 250 м. Пиксель может включать несколько полей; NDVI не определяет культуру и урожай.'],
   water: ['Водный контекст', 'MOD16A2GF: ET и PET для первого доступного композита хорошего качества за май 2025. Разрешение 500 м; эти значения не являются нормой полива или измерением влаги в почве.']
 };

 useEffect(()=>{try {const saved=JSON.parse(localStorage.getItem('bogara-field')); if(saved && Array.isArray(saved.rotation) && saved.rotation.length===5 && saved.rotation.every(c=>crops.includes(c))) {setRotation(saved.rotation); setField(saved.field || 'Поле в предгорьях'); setLat(saved.lat || '42.4');setLon(saved.lon || '69.85');setPriority(priorities.includes(saved.priority)?saved.priority:priorities[0]);}} catch {}},[]);
 function saveDraft() {
   const a=Number(draft.lat), b=Number(draft.lon);
   if (!draft.lat.trim() || !draft.lon.trim() || !Number.isFinite(a) || !Number.isFinite(b) || a<40 || a>44 || b<67 || b>72) {setError('Введите координаты в пределах 40–44° с.ш. и 67–72° в.д.'); return;}
   requestRef.current?.abort(); requestRef.current = null; setShowHistory(false);setHelp(null);
   setRotation(draft.rotation);setLat(draft.lat);setLon(draft.lon);setField(draft.field.trim() || 'Моё поле');setPriority(draft.priority);setData(null);setStatus('idle');setError('');setModal(false);
   try { localStorage.setItem('bogara-field',JSON.stringify(draft)); } catch { /* settings still work for this session */ }
 }
 async function loadData() {
   requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller;
   setStatus('loading');setData(null);setShowHistory(false);
   try { const res=await fetch(`/api/context?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, {signal: controller.signal}); const result=await res.json(); if(!res.ok) throw new Error(result.error); if(requestRef.current !== controller) return; setData(result);setStatus('done'); }
   catch (err) {if (err.name !== 'AbortError' && requestRef.current === controller) {setData(null);setStatus('failed');}}
   finally {if(requestRef.current === controller) requestRef.current = null;}
 }
 const currentWheat=rotation.filter(c=>c==='Озимая пшеница').length;
 const strategies = [
  {id:'A', eyebrow:'ВАША ТОЧКА ОТСЧЁТА', title:'Текущая ротация', desc:'То, что вы уже выращиваете. Используйте как основу для сравнения.', rotation, benefits:currentWheat===5?'Привычная техника и понятный сбыт при бессменной пшенице.':'Опирается на вашу последовательность культур и опыт хозяйства.', risk:currentWheat===5?'Болезни, сорняки и зависимость от одного рынка могут накапливаться.':'Проверьте влагу, болезни и рынок для каждого предшественника.', gap:'История поля, урожайность, удобрения и засорённость.', question:'Какие болезни и сорняки повторяются на этом поле?'},
  {id:'B', eyebrow:'МЕСТНАЯ ПРАКТИКА', title:'Ротация с чистым паром', desc:'Год отдыха почвы перед пшеницей и разнообразие культур.', rotation:['Чистый пар','Озимая пшеница','Сафлор','Озимая пшеница','Люцерна'], benefits:'Пар может помочь накопить влагу перед посевом пшеницы.', risk:'Голый пар подвержен эрозии; сбыт сафлора и влага после него не гарантированы.', gap:'Глубинная влага, затраты, цена сафлора и режим укосов.', question:'Как сохранить остатки и влагу в год чистого пара?'},
  {id:'C', eyebrow:'АЛЬТЕРНАТИВА С НУТОМ', title:'Ротация с нутом', desc:'Нут вместо чистого пара: больше разнообразия, меньше голой почвы.', rotation:['Нут','Озимая пшеница','Сафлор','Озимая пшеница','Люцерна'], benefits:'Бобовый компонент и возможная диверсификация дохода.', risk:'Нут может использовать влагу, нужную следующей пшенице; рынок не проверен.', gap:'Запасы влаги, сорта, болезни, азотфиксация и покупатели.', question:'Хватит ли почвенной влаги для пшеницы после нута?'}
 ];
 const selected=strategies.find(s=>s.id===active);
 const priorityNote = priority==='Сохранить влагу'?'Сравните запас влаги после предшественника, особенно после нута и сафлора.':priority==='Защитить почву'?'Обсудите растительные остатки и риск эрозии на чистом пару.':'Проверьте покупателя и цену до выбора нута или сафлора.';
 return <>
 <header className="header"><div className="header-inner"><a href="#top" className="brand"><span className="brand-mark"><Sprout size={21}/></span><span>Bogara<span>Shift</span></span></a><nav id="main-navigation" aria-label="Основная навигация" className={mobile?'nav open':'nav'}><a href="#overview" aria-current={navActive==='overview'?'location':undefined} onClick={()=>{setMobile(false);setNavActive('overview')}}>Обзор поля</a><a href="#compare" aria-current={navActive==='compare'?'location':undefined} onClick={()=>{setMobile(false);setNavActive('compare')}}>Сравнение ротаций</a><a href="#data" aria-current={navActive==='data'?'location':undefined} onClick={()=>{setMobile(false);setNavActive('data')}}>Данные и методология</a></nav><div className="header-right"><span className="header-region"><MapPin size={15}/> Шымкент, Казахстан</span><button className="menu" onClick={()=>setMobile(!mobile)} aria-label={mobile?"Закрыть меню":"Открыть меню"} aria-expanded={mobile} aria-controls="main-navigation">{mobile?<X/>:<Menu/>}</button></div></div></header>
 <main id="top"><div className="page-wrap">
 <div className="breadcrumb"><span>МОЁ ХОЗЯЙСТВО</span><span>/</span><span>ОБЗОР ПОЛЯ</span></div>
 <section className="hero"><div className="hero-copy"><div className="eyebrow light"><span className="dot"/> РЕШЕНИЯ ДЛЯ БОГАРНОГО ЗЕМЛЕДЕЛИЯ</div><h1>Будущее поля<br/><em>начинается с выбора.</em></h1><p>Сравните севообороты для богарной пшеницы и найдите вопросы, которые стоит обсудить с агрономом.</p><a className="hero-button" href="#compare">Сравнить стратегии <ArrowRight size={17}/></a></div><div className="hero-caption"><span>ЮЖНЫЙ КАЗАХСТАН</span><b>Предгорья Шымкента</b><small>БОГАРНОЕ ЗЕМЛЕДЕЛИЕ · 42° С.Ш.</small></div></section>
 <div className="intro-row" id="overview"><div><div className="section-kicker"><span>01</span> ВАШЕ ПОЛЕ</div><h2>Начнём с вашего поля</h2><p>Контекст для сравнения трёх стратегий на одном горизонте.</p></div><button className="outline-button" onClick={openSettings}><Pencil size={15}/> Настроить поле</button></div>
 <section className="field-card"><div className="field-main"><div className="field-icon"><MapPin size={21}/></div><div><div className="field-top"><h3>{field}</h3><span className="tag">БОГАРА</span></div><p>Шымкент · {lat}° с.ш., {lon}° в.д.</p></div></div><div className="field-stat"><span>ТЕКУЩАЯ РОТАЦИЯ</span><strong>{currentWheat===5?'Пшеница · 5 лет':'Своя ротация · 5 лет'}</strong><small>Редактируемый пример</small></div><div className="field-stat priority"><span>ВАШ ПРИОРИТЕТ</span><strong>{priority}</strong><small>Для обсуждения с агрономом</small></div><button className="field-edit" aria-label="Настроить поле" onClick={openSettings}><ArrowUpRight size={19}/></button></section>
 <section className="context" id="data"><div className="section-heading"><div><div className="section-kicker"><span>02</span> ИСТОРИЧЕСКИЙ КОНТЕКСТ</div><h2>Что говорят данные</h2><p>Спутниковые данные помогают увидеть общую картину, но не заменяют измерения на поле.</p></div><button className="text-button" onClick={loadData} disabled={status==='loading'}><Satellite size={16}/> {status==='loading'?'Загружаем…':status==='done'?'Обновить данные NASA':'Загрузить данные NASA'} <ArrowRight size={15}/></button></div>
 <div className="data-grid"><div className="data-card"><div className="data-label"><span className="data-icon blue"><CloudRain size={17}/></span> ОСАДКИ ВЕСНОЙ <HelpButton name="rain" title={helpText.rain[0]} selected={help==='rain'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{data?.power ? `${data.power.median} мм` : '—'} <small>{data?.power?'медиана':'нет данных'}</small></div><p>{data?.power ? `${data.power.below} из ${data.power.years.length} полных сезонов ниже медианы` : 'Март–май · NASA POWER, 2005–2024'}</p><div className="data-foot"><span className="foot-dot"/> ИСТОРИЯ, НЕ ПРОГНОЗ</div></div><div className="data-card"><div className="data-label"><span className="data-icon gold"><Sun size={17}/></span> ЖАРКИЕ ДНИ <HelpButton name="heat" title={helpText.heat[0]} selected={help==='heat'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{data?.power ? data.power.hotMedian : '—'} <small>{data?.power?'дней / сезон':'нет данных'}</small></div><p>Дни с максимумом ≥ 30 °C весной</p><div className="data-foot"><span className="foot-dot"/> NASA POWER · МАРТ–МАЙ</div></div><div className="data-card"><div className="data-label"><span className="data-icon green"><Leaf size={17}/></span> ЗЕЛЁНОСТЬ NDVI <HelpButton name="ndvi" title={helpText.ndvi[0]} selected={help==='ndvi'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{data?.ndvi?.value ?? '—'} <small>{data?.ndvi?'NDVI':'нет данных'}</small></div><p>{data?.ndvi ? `Первый доступный композит · ${data.ndvi.date}` : 'MODIS · пример окна: май 2025'}</p><div className="data-foot"><span className="foot-dot"/> СМЕШАННЫЙ ПИКСЕЛЬ · 250 М</div></div><div className="data-card"><div className="data-label"><span className="data-icon teal"><Droplets size={17}/></span> ВОДНЫЙ КОНТЕКСТ <HelpButton name="water" title={helpText.water[0]} selected={help==='water'} onToggle={name=>setHelp(help===name?null:name)}/></div><div className="data-value">{data?.et ? `${data.et.value} мм` : '—'} <small>{data?.et?'ET / композит':'нет данных'}</small></div><p>{data?.pet ? `PET ${data.pet.value} мм · ${data.pet.date}` : 'MODIS ET/PET · пример окна: май 2025'}</p><div className="data-foot"><span className="foot-dot"/> НЕ НОРМА ПОЛИВА · 500 М</div></div></div>
 {help && <div className="help-panel" id="data-help" role="region" aria-label={helpText[help][0]}><div><strong>{helpText[help][0]}</strong><p>{helpText[help][1]}</p></div><button type="button" onClick={()=>setHelp(null)} aria-label="Закрыть пояснение"><X size={16}/></button></div>}
 {data?.power && <div className="history"><button className="history-toggle" type="button" onClick={()=>setShowHistory(!showHistory)} aria-expanded={showHistory} aria-controls="history-table">{showHistory?'Скрыть историю по годам':'Посмотреть историю по годам'} <ArrowRight size={15}/></button>{showHistory && <div id="history-table" className="history-table-wrap"><p>Полные окна марта–мая. Это данные модельной ячейки POWER, не наблюдения на поле.</p><table><thead><tr><th>Год</th><th>Осадки, мм</th><th>Дней ≥ 30 °C</th><th>Относительно медианы осадков</th></tr></thead><tbody>{data.power.years.map(y=><tr key={y.year}><td>{y.year}</td><td>{y.precipitation}</td><td>{y.hotDays}</td><td>{y.precipitation < data.power.median ? 'Ниже' : y.precipitation > data.power.median ? 'Выше' : 'На медиане'}</td></tr>)}</tbody></table></div>}</div>}
 {(status==='done' && (!data?.power || !data?.ndvi || !data?.et) || status==='failed') && <div className="notice"><ShieldAlert size={17}/> Часть источников сейчас недоступна или не вернула качественных данных. Повторите запрос позже; пропуски не заменяются вымышленными значениями. Для POWER и ORNL ключ не требуется: серверу нужен исходящий доступ к этим сайтам.</div>}
 <div className="data-note"><Satellite size={17}/><p><strong>Как читать эти данные?</strong> POWER описывает крупную ячейку, MODIS может смешивать несколько полей. Это исторический контекст, а не измерение влажности, прогноз урожая или рекомендация по поливу.</p><a href="#sources">Об источниках <ArrowRight size={14}/></a></div></section>
 <section className="comparison" id="compare"><div className="section-heading compare-heading"><div><div className="section-kicker"><span>03</span> СРАВНЕНИЕ СТРАТЕГИЙ</div><h2>Три пути для вашего поля</h2><p>Одинаковый горизонт — разные компромиссы. Выберите карточку, чтобы изучить детали.</p></div><div className="horizon"><span>ГОРИЗОНТ СРАВНЕНИЯ</span><strong>5 лет</strong></div></div>
 <div className="legend"><span>КУЛЬТУРЫ</span>{crops.map(c=><div key={c}><i className={classes[c]}/>{short[c]}</div>)}</div>
 <div className="strategy-grid">{strategies.map(s=><button key={s.id} className={`strategy-card ${active===s.id?'selected':''}`} onClick={()=>setActive(s.id)} aria-pressed={active===s.id}><div className="strategy-top"><span className="letter">{s.id}</span><span className="strategy-eyebrow">{s.eyebrow}</span>{active===s.id && <span className="selected-mark"><Check size={13}/></span>}</div><h3>{s.title}</h3><p>{s.desc}</p><div className="rotation-title">ПОСЛЕДОВАТЕЛЬНОСТЬ ПО ГОДАМ</div><div className="rotation">{s.rotation.map((crop,i)=><div className="year" key={i}><span>{String(i+1).padStart(2,'0')}</span><div className={`crop-icon ${classes[crop]}`}><CropIcon crop={crop}/></div><small>{short[crop]}</small></div>)}</div><div className="card-bottom">{active===s.id?'Выбрана для изучения':'Изучить стратегию'} <ArrowRight size={15}/></div></button>)}</div>
 <div className="detail-panel"><div className="detail-title"><div><div className="detail-eyebrow">СТРАТЕГИЯ {selected.id} · ДЕТАЛИ СРАВНЕНИЯ</div><h3>{selected.title}</h3><p>Не готовый ответ, а основа для разговора о вашем поле.</p></div><span className="detail-badge"><Sprout size={15}/> 5-летняя ротация</span></div><div className="detail-grid"><div><span className="detail-label benefit"><Check size={14}/> ВОЗМОЖНАЯ ВЫГОДА</span><p>{selected.benefits}</p></div><div><span className="detail-label risk"><ShieldAlert size={14}/> НА ЧТО ОБРАТИТЬ ВНИМАНИЕ</span><p>{selected.risk}</p></div><div><span className="detail-label gap"><CircleHelp size={14}/> ЧЕГО МЫ НЕ ЗНАЕМ</span><p>{selected.gap}</p></div></div><div className="question"><span><b>Вопрос агроному</b> {selected.question}</span><ArrowUpRight size={17}/></div></div>
 <div className="priority-note"><span className="priority-icon"><Droplets size={18}/></span><p><strong>Ваш приоритет: {priority.toLowerCase()}.</strong> {priorityNote}</p><button onClick={openSettings}>Изменить <ArrowRight size={14}/></button></div></section>
 <section className="closing"><div><div className="section-kicker"><span>04</span> СЛЕДУЮЩИЙ ШАГ</div><h2>Хорошее решение начинается<br/>с правильных вопросов.</h2><p>Обсудите выбранную ротацию с местным агрономом и проверьте влагу, почву и возможности сбыта до посева.</p></div><button onClick={()=>window.print()}>Печать / сохранить PDF <ArrowDownRight size={17}/></button></section>
 <footer id="sources"><div className="footer-top"><div><a href="#top" className="brand footer-brand"><span className="brand-mark"><Sprout size={20}/></span><span>Bogara<span>Shift</span></span></a><p>Более осознанные решения<br/>для богарного земледелия.</p></div><div className="sources"><span>ИСТОЧНИКИ И МЕТОДОЛОГИЯ</span><div>{sources.map(([name,desc,url])=><a key={name} href={url} target="_blank" rel="noreferrer" title={desc}>{name} <ExternalLink size={12}/></a>)}</div></div></div><div className="footer-bottom"><span>© 2026 BOGARASHIFT · INNISTELLAR</span><span>ПОДДЕРЖКА РЕШЕНИЙ, А НЕ ЗАМЕНА АГРОНОМА</span></div></footer>
 </div></main>
 {modal && draft && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div className="modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><div className="section-kicker"><span>НАСТРОЙКА</span> ВАШЕ ПОЛЕ</div><h2 id="modal-title">Расскажите о поле</h2><p>Данные сохраняются только в этом браузере.</p></div><button className="close" onClick={()=>setModal(false)} aria-label="Закрыть"><X size={20}/></button></div><div className="form-grid"><label className="full">Название поля<input value={draft.field} maxLength={60} onChange={e=>setDraft({...draft,field:e.target.value})}/></label><label>Широта<input type="number" step="0.01" value={draft.lat} onChange={e=>setDraft({...draft,lat:e.target.value})}/></label><label>Долгота<input type="number" step="0.01" value={draft.lon} onChange={e=>setDraft({...draft,lon:e.target.value})}/></label><p className="form-hint full"><LocateFixed size={14}/> Введите координаты точки поля в пределах региона: 40–44° с.ш., 67–72° в.д.</p><label className="full">Главный приоритет<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label><div className="full rotation-form"><strong>Текущая ротация · 5 лет</strong><p>Пример — бессменная пшеница. Замените его своей последовательностью.</p>{draft.rotation.map((crop,i)=><label key={i}><span>Год {i+1}</span><select value={crop} onChange={e=>{const r=[...draft.rotation];r[i]=e.target.value;setDraft({...draft,rotation:r})}}>{crops.map(c=><option key={c}>{c}</option>)}</select></label>)}</div>{error && <p className="form-error full">{error}</p>}</div><div className="modal-actions"><button className="outline-button" onClick={()=>setModal(false)}>Отмена</button><button className="primary-button" onClick={saveDraft}>Сохранить поле <ArrowRight size={16}/></button></div></div></div>}
 </>;
}
export default App;
