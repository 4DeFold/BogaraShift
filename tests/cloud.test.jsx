import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const mock=vi.hoisted(()=>({rpc:vi.fn(),authCallback:null,revision:0}));
vi.mock('../lib/supabase-client.js',()=>({authRedirect:'https://example.test/fieldplan',supabase:{auth:{onAuthStateChange:(cb)=>{mock.authCallback=cb;queueMicrotask(()=>cb('INITIAL_SESSION',{user:{id:'user-a',email:'a@example.test'}}));return {data:{subscription:{unsubscribe:vi.fn()}}}},signOut:vi.fn()},from:()=>({select:()=>({order:async()=>({data:[{id:'farm-a',name:'Farm',revision:mock.revision}],error:null})})}),rpc:mock.rpc}}));
import CloudWorkspace from '../app/components/CloudWorkspace.jsx';
const key='bogarashift-selectmap-v1';
const field={name:'Field',cell:{id:'a',lat:42.4,lon:69.8,source:'manual',polygon:[[42.4,69.8],[42.4,69.81],[42.41,69.81],[42.41,69.8]]},report:{name:'private.pdf',data:'data:application/pdf;base64,cGRm'}};
beforeEach(()=>{localStorage.clear();localStorage.setItem(key,JSON.stringify([field]));vi.spyOn(window,'confirm').mockReturnValue(true);mock.rpc.mockReset();mock.revision=0});afterEach(()=>{cleanup();vi.restoreAllMocks()});
async function open(onReplace=vi.fn()){render(<CloudWorkspace lang="ru" onReplace={onReplace}/>);fireEvent.click(screen.getByText('Хозяйство / облако'));await screen.findByText(/Вы вошли как/);await screen.findByRole('button',{name:'Сохранить локальные поля в облако'});return onReplace;}
describe('manual cloud operations',()=>{
 it('uploads without local report data and keeps the browser copy',async()=>{mock.rpc.mockResolvedValue({data:1,error:null});await open();fireEvent.click(screen.getByRole('button',{name:'Сохранить локальные поля в облако'}));await screen.findByText(/Поля сохранены в облаке/);const [name,args]=mock.rpc.mock.calls[0];expect(name).toBe('save_farm_fields');expect(args.p_fields[0].report).toBeUndefined();expect(JSON.parse(localStorage.getItem(key))[0].report.name).toBe('private.pdf');});
 it('does not overwrite the browser when local data changes while loading',async()=>{let resolve;mock.rpc.mockImplementation(()=>new Promise(r=>{resolve=r}));const onReplace=await open();fireEvent.click(screen.getByRole('button',{name:'Загрузить поля из облака'}));localStorage.setItem(key,'[]');resolve({data:{revision:1,fields:[]},error:null});await screen.findByText(/Локальные данные изменились во время загрузки/);expect(localStorage.getItem(key)).toBe('[]');expect(onReplace).not.toHaveBeenCalled();});
 it('reports a revision conflict without altering local data',async()=>{mock.rpc.mockResolvedValue({data:null,error:{message:'REVISION_CONFLICT',code:'40001'}});await open();fireEvent.click(screen.getByRole('button',{name:'Сохранить локальные поля в облако'}));await screen.findByText(/В облаке появились изменения/);expect(JSON.parse(localStorage.getItem(key))[0].name).toBe('Field');});
});
it('loads an atomic cloud snapshot only after confirmation and advances its revision',async()=>{
 const polygon={type:'Polygon',coordinates:[[[69.8,42.4],[69.81,42.4],[69.81,42.41],[69.8,42.41],[69.8,42.4]]]};
 mock.rpc.mockResolvedValue({data:{revision:4,fields:[{payload:{name:'Cloud',cell:{id:'remote'}},geometry:polygon,area_ha:91.3,lat:42.405,lon:69.805,source:'manual',status:'draft'}]},error:null});
 const onReplace=await open();fireEvent.click(screen.getByRole('button',{name:'Загрузить поля из облака'}));await screen.findByText('Поля загружены в браузер.');expect(mock.rpc.mock.calls[0][0]).toBe('load_farm_snapshot');expect(onReplace).toHaveBeenCalledOnce();expect(JSON.parse(localStorage.getItem(key))[0].name).toBe('Cloud');expect(screen.getByText(/Версия облака: 4/)).toBeTruthy();
});

it('prevents uploading to an existing cloud farm until its version was loaded',async()=>{
 mock.revision=5;await open();expect(screen.getByRole('button',{name:'Сохранить локальные поля в облако'}).disabled).toBe(true);expect(screen.getByText(/Облачная версия не соответствует локальной копии/)).toBeTruthy();expect(mock.rpc).not.toHaveBeenCalled();
});
it('rechecks the sync marker before upload if another tab switched farms',async()=>{
 mock.revision=5;localStorage.setItem('bogarashift-cloud-sync-v1',JSON.stringify({userId:'user-a',farmId:'farm-a',revision:5}));await open();const upload=screen.getByRole('button',{name:'Сохранить локальные поля в облако'});expect(upload.disabled).toBe(false);localStorage.setItem('bogarashift-cloud-sync-v1',JSON.stringify({userId:'user-a',farmId:'different-farm',revision:1}));fireEvent.click(upload);expect(mock.rpc).not.toHaveBeenCalled();expect(await screen.findByText(/Облачная версия не соответствует локальной копии/)).toBeTruthy();
});
