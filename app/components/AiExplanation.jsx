'use client';
import {useEffect,useRef,useState} from 'react';
import {Sparkles} from 'lucide-react';
import {supabase} from '../../lib/supabase-client.js';
const copy={
 ru:{title:'Объяснение ИИ',hint:'По запросу Z.ai получит выбранную культуру, сезон, предыдущую культуру и отмеченные наблюдения. Название поля, координаты, файл анализа, его содержимое и данные NASA не передаются. Ответ справочный, не рекомендация; проверяйте его с агрономом.',button:'Получить объяснение',loading:'Готовим объяснение…',auth:'Для ИИ нужен аккаунт. Закройте поле и откройте «Хозяйство / облако» на странице плана.',account:'Перейти ко входу',limit:'Достигнут дневной лимит приложения или провайдера. Планирование и климат доступны без ИИ.',unavailable:'ИИ сейчас недоступен. Данные поля и инструменты планирования продолжают работать.',model:'Модель',stale:'Ответ относится к выбранным данным и не заменяет анализ почвы.'},
 en:{title:'AI explanation',hint:'On request, Z.ai receives the selected crop, season, previous crop and selected observations. The field name, coordinates, soil file, its contents and NASA data are not sent. The answer is informational, not a recommendation; check it with an agronomist.',button:'Get explanation',loading:'Preparing explanation…',auth:'AI requires an account. Close this field and open “Farm / cloud” on the plan page.',account:'Go to sign in',limit:'The application or provider daily limit has been reached. Planning and climate work without AI.',unavailable:'AI is currently unavailable. Field data and planning tools continue to work.',model:'Model',stale:'The answer refers to the selected inputs and does not replace a soil analysis.'},
 kk:{title:'ЖИ түсіндірмесі',hint:'Сұрау бойынша Z.ai таңдалған дақылды, маусымды, алдыңғы дақылды және белгіленген бақылауларды алады. Танап атауы, координаттар, талдау файлы мен оның мазмұны және NASA деректері жіберілмейді. Жауап ақпараттық, ұсыныс емес; агрономмен тексеріңіз.',button:'Түсіндірме алу',loading:'Түсіндірме дайындалуда…',auth:'ЖИ үшін аккаунт қажет. Танапты жауып, жоспар бетіндегі «Шаруашылық / бұлт» бөлімін ашыңыз.',account:'Кіруге өту',limit:'Қолданбаның немесе провайдердің күндік лимитіне жетті. Жоспарлау мен климат ЖИ-сіз жұмыс істейді.',unavailable:'ЖИ қазір қолжетімсіз. Танап деректері мен жоспарлау құралдары жұмысын жалғастырады.',model:'Модель',stale:'Жауап таңдалған деректерге қатысты және топырақ талдауын алмастырмайды.'}
};
export default function AiExplanation({field,year,lang,onGoAccount}){
 const t=copy[lang],context={lang,year,crop:field.displayCrop||'',previous:field.cropHistory?.[year-1]||'',texture:field.texture||'unknown',drainage:field.drainage||'unknown',drying:field.drying||'unknown',salinity:field.salinity||'unknown',terrain:field.terrain||'unknown'},contextKey=JSON.stringify(context);
 const [state,setState]=useState({status:'idle'}),abort=useRef(null);
 useEffect(()=>{abort.current?.abort();setState({status:'idle'});return()=>abort.current?.abort()},[contextKey]);
 async function run(){
  abort.current?.abort();const controller=new AbortController();abort.current=controller;setState({status:'loading'});
  try{
   if(!supabase){setState({status:'auth'});return;}
   const {data,error}=await supabase.auth.getSession();if(controller.signal.aborted)return;if(error||!data?.session?.access_token){setState({status:'auth'});return;}
   const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:contextKey,signal:controller.signal});
   if(controller.signal.aborted)return;if(r.status===401){setState({status:'auth'});return;}if(r.status===429){setState({status:'limit'});return;}if(!r.ok)throw Error();const result=await r.json();if(!controller.signal.aborted)setState({status:'ok',...result});
  }catch{if(!controller.signal.aborted)setState({status:'error'});}
 }
 return <section className="ai-placeholder"><div className="ai-icon"><Sparkles size={19}/></div><div><div className="ai-label">AI / Z.AI</div><h3>{t.title}</h3><p>{t.hint}</p><button type="button" className="climate-button" disabled={state.status==='loading'} onClick={run}>{state.status==='loading'?t.loading:t.button}</button>{state.status==='auth'&&<><p role="status">{t.auth}</p>{onGoAccount&&<button type="button" className="climate-button" onClick={onGoAccount}>{t.account}</button>}</>}{state.status==='limit'&&<p role="status">{t.limit}</p>}{state.status==='error'&&<p role="status">{t.unavailable}</p>}{state.status==='ok'&&<><p style={{whiteSpace:'pre-wrap'}}>{state.answer}</p><small>{t.model}: {state.model} · {t.stale}</small></>}</div></section>;
}
