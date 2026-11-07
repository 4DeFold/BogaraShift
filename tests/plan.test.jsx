import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within,waitFor} from '@testing-library/react';
vi.mock('next/dynamic',()=>({default:()=>function MapStub(props){return props.onOpen?<button onClick={()=>props.onOpen(props.fields[0]?.cell.id)}>Map field</button>:<div>NASA preview</div>}}));
import FieldPlan from '../app/fieldplan/page.jsx';
const key='bogarashift-selectmap-v1';
const field=(id,name,offset=0)=>({name,cell:{id,lat:42.4+offset,lon:69.85,polygon:[[42.4+offset,69.85],[42.4+offset,69.86],[42.41+offset,69.86],[42.41+offset,69.85]],source:'manual',imageDate:'2025-05-25',sensor:'s30'},texture:'loamy',drainage:'quick',drying:'unknown',salinity:'unknown',terrain:'slope',moisture:'',yieldHistory:'',equipment:'',buyer:'',report:null});
beforeEach(()=>localStorage.clear());afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('field plan',()=>{
 it('shows a useful empty state and selection links without inventing fields',async()=>{render(<FieldPlan/>);expect(await screen.findByText('Пока нет выбранных полей')).toBeTruthy();expect(screen.getAllByRole('link',{name:/Выбрать поля/}).length).toBeGreaterThan(0);expect(screen.queryByRole('button',{name:/Посмотреть детали/})).toBeNull();});
 it('shows saved fields and opens the same full screen details from card or map',async()=>{localStorage.setItem(key,JSON.stringify([field('a','Верхнее поле'),field('b','Нижнее поле',.02)]));render(<FieldPlan/>);expect(await screen.findByRole('button',{name:/Верхнее поле — Посмотреть детали/})).toBeTruthy();expect(screen.getByRole('button',{name:/Нижнее поле — Посмотреть детали/})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Map field'}));let dialog=screen.getByRole('dialog',{name:'Верхнее поле'});expect(within(dialog).getByRole('button',{name:'Получить объяснение'})).toBeTruthy();expect(within(dialog).getByText(/Засоление не указано/)).toBeTruthy();fireEvent.click(within(dialog).getByRole('button',{name:'Закрыть'}));fireEvent.click(screen.getByRole('button',{name:/Нижнее поле — Посмотреть детали/}));expect(screen.getByRole('dialog',{name:'Нижнее поле'})).toBeTruthy();fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();});
 it('saves a manual crop choice without changing other field data and reopens it',async()=>{localStorage.setItem(key,JSON.stringify([field('a','Поле')]));const {unmount}=render(<FieldPlan/>);fireEvent.click(await screen.findByRole('button',{name:/Поле — Посмотреть детали/}));fireEvent.change(screen.getByLabelText('Выберите культуру вручную'),{target:{value:'chickpea'}});expect(screen.getByRole('heading',{name:'Нут'})).toBeTruthy();let stored=JSON.parse(localStorage.getItem(key));expect(stored[0].seasonPlans[new Date().getFullYear()].A.crop).toBe('chickpea');expect(stored[0].texture).toBe('loamy');expect(stored[0].cell.polygon).toHaveLength(4);unmount();render(<FieldPlan/>);fireEvent.click(await screen.findByRole('button',{name:/Поле — Посмотреть детали/}));expect(screen.getByLabelText('Выберите культуру вручную').value).toBe('chickpea');expect(screen.getByText(/не результат расчёта/)).toBeTruthy();});
 it('reports a failed save without changing the crop',async()=>{localStorage.setItem(key,JSON.stringify([field('a','Поле')]));render(<FieldPlan/>);fireEvent.click(await screen.findByRole('button',{name:/Поле — Посмотреть детали/}));vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('full')});fireEvent.change(screen.getByLabelText('Выберите культуру вручную'),{target:{value:'wheat'}});expect(screen.getByRole('alert').textContent).toContain('Не удалось сохранить');expect(screen.getByLabelText('Выберите культуру вручную').value).toBe('');});
 it('keeps the language and translates the empty state',async()=>{localStorage.setItem('bogarashift-selectmap-language','kk');render(<FieldPlan/>);expect(await screen.findByText('Танаптар жоспары.')).toBeTruthy();fireEvent.change(screen.getByLabelText('Language'),{target:{value:'en'}});expect(screen.getByText('No fields selected yet')).toBeTruthy();expect(localStorage.getItem('bogarashift-selectmap-language')).toBe('en');});
});
describe('local planning dashboard',()=>{
 it('paginates 300 fields without mounting map thumbnails',async()=>{
  localStorage.setItem(key,JSON.stringify(Array.from({length:300},(_,i)=>field(String(i),`Поле ${i}`,i*.001))));render(<FieldPlan/>);
  expect(await screen.findByText('Страница 1 / 6')).toBeTruthy();expect(document.querySelectorAll('.plan-card')).toHaveLength(50);expect(document.querySelectorAll('.outline-preview')).toHaveLength(50);
  fireEvent.click(screen.getByRole('button',{name:'Далее'}));expect(screen.getByText('Страница 2 / 6')).toBeTruthy();expect(screen.getByRole('button',{name:/Поле 50 —/})).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Поиск поля'),{target:{value:'Поле 299'}});expect(screen.getByRole('button',{name:/Поле 299 —/})).toBeTruthy();expect(document.querySelectorAll('.plan-card')).toHaveLength(1);
 });
 it('keeps scenario choices and legacy choice separate across reloads',async()=>{
  const f=field('a','Поле');f.plannedCrop='alfalfa';localStorage.setItem(key,JSON.stringify([f]));render(<FieldPlan/>);
  fireEvent.click(await screen.findByRole('button',{name:/Поле — Посмотреть детали/}));expect(screen.getByText(/Ранее выбранная культура без сезона/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Выберите культуру вручную'),{target:{value:'wheat'}});fireEvent.click(screen.getByRole('button',{name:'Закрыть'}));fireEvent.change(screen.getByLabelText('Сценарий'),{target:{value:'B'}});
  fireEvent.click(screen.getByRole('button',{name:/Поле — Посмотреть детали/}));expect(screen.getByLabelText('Выберите культуру вручную').value).toBe('');fireEvent.change(screen.getByLabelText('Выберите культуру вручную'),{target:{value:'chickpea'}});
  const data=JSON.parse(localStorage.getItem(key))[0],year=new Date().getFullYear();expect(data.plannedCrop).toBe('alfalfa');expect(data.seasonPlans[year].A.crop).toBe('wheat');expect(data.seasonPlans[year].B.crop).toBe('chickpea');
 });
});


describe('import and backup',()=>{
 it('imports valid GeoJSON only as draft and preserves existing fields',async()=>{
  vi.spyOn(window,'confirm').mockReturnValue(true);localStorage.setItem(key,JSON.stringify([field('existing','Старое')]));render(<FieldPlan/>);await screen.findByRole('button',{name:/Старое —/});
  const geo={type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Импорт',boundary_status:'confirmed'},geometry:{type:'Polygon',coordinates:[[[69.8,42.4],[69.81,42.4],[69.81,42.41],[69.8,42.41],[69.8,42.4]]]}}]};
  const file=new File(['x'],'fields.geojson',{type:'application/geo+json'});Object.defineProperty(file,'text',{value:async()=>JSON.stringify(geo)});fireEvent.change(screen.getByLabelText('Импорт GeoJSON'),{target:{files:[file]}});
  await waitFor(()=>expect(JSON.parse(localStorage.getItem(key))).toHaveLength(2));const items=JSON.parse(localStorage.getItem(key));expect(items[1].cell.boundaryStatus).toBe('draft');expect(items[1].cell.source).toBe('imported');expect(items[0].name).toBe('Старое');
 });
 it('rejects invalid geometry without changing local data',async()=>{
  localStorage.setItem(key,JSON.stringify([field('existing','Старое')]));render(<FieldPlan/>);await screen.findByRole('button',{name:/Старое —/});
  const geo={type:'Polygon',coordinates:[[[69,42],[69.01,42.01],[69,42.01],[69.01,42],[69,42]]]};const file=new File(['x'],'bad.geojson');Object.defineProperty(file,'text',{value:async()=>JSON.stringify(geo)});fireEvent.change(screen.getByLabelText('Импорт GeoJSON'),{target:{files:[file]}});
  await screen.findByText(/Файл не подходит/);expect(JSON.parse(localStorage.getItem(key))).toHaveLength(1);
 });
});
