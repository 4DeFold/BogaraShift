import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
vi.mock('next/dynamic',()=>({default:()=>function MapStub(props){if(props.mini)return <div>Map preview</div>;if(props.demoFields)return <div>{props.demoFields.map((f,i)=><button key={f.cell.id} onClick={()=>props.onDemoSelect(f)}>Demo map {i+1}</button>)}</div>;if(props.onOpen)return <button onClick={()=>props.onOpen(props.fields[0]?.cell.id)}>Map field</button>;return <div>Map</div>}}));
import SelectMap from '../app/selectmap/page.jsx';
import FieldPlan from '../app/fieldplan/page.jsx';
import {DEMO_STORAGE} from '../lib/demo.mjs';
beforeEach(()=>{localStorage.clear();vi.spyOn(window,'confirm').mockReturnValue(true)});afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
it('shows ten examples and lets a cleared cell be added without manual entry',async()=>{
 const real='[{"secret":"real-field"}]';localStorage.setItem('bogarashift-selectmap-v1',real);localStorage.setItem('bogarashift-cloud-sync-v1','existing-marker');render(<SelectMap demo/>);
 expect(await screen.findByText(/все поля, границы и анализы вымышлены/i)).toBeTruthy();expect(screen.getAllByRole('button',{name:/Demo map/})).toHaveLength(10);expect(JSON.parse(localStorage.getItem(DEMO_STORAGE))).toHaveLength(10);
 fireEvent.click(screen.getByRole('button',{name:'Очистить список демо-полей'}));expect(JSON.parse(localStorage.getItem(DEMO_STORAGE))).toHaveLength(0);
 fireEvent.click(screen.getByRole('button',{name:'Demo map 1'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByText(/Пример анализа почвы/)).toBeTruthy();expect(within(dialog).getByText('demo-analysis-01.txt')).toBeTruthy();expect(within(dialog).getByLabelText('Название поля').value).toBe('Demo 01');fireEvent.click(within(dialog).getByRole('button',{name:'Добавить поле'}));
 await waitFor(()=>expect(JSON.parse(localStorage.getItem(DEMO_STORAGE))).toHaveLength(1));expect(localStorage.getItem('bogarashift-selectmap-v1')).toBe(real);expect(localStorage.getItem('bogarashift-cloud-sync-v1')).toBe('existing-marker');
 expect(screen.getAllByRole('link').filter(a=>a.getAttribute('href')?.startsWith('/')).every(a=>a.getAttribute('href').startsWith('/demo/'))).toBe(true);
});
it('demo plan is prefilled, account-free, isolated and never calls climate or AI APIs',async()=>{
 localStorage.setItem('bogarashift-selectmap-v1','[]');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);render(<FieldPlan demo/>);
 fireEvent.click(await screen.findByRole('button',{name:/Demo 01 —/}));const dialog=screen.getByRole('dialog',{name:'Demo 01'});
 expect(within(dialog).getByText(/Пример анализа почвы/)).toBeTruthy();expect(within(dialog).getByText(/это не ответ ИИ/)).toBeTruthy();expect(within(dialog).getByText(/не данные NASA/)).toBeTruthy();expect(screen.queryByText('Хозяйство / облако')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
 fireEvent.change(within(dialog).getByLabelText('Выберите культуру вручную'),{target:{value:'chickpea'}});expect(JSON.parse(localStorage.getItem(DEMO_STORAGE))[0].seasonPlans[new Date().getFullYear()].A.crop).toBe('chickpea');expect(localStorage.getItem('bogarashift-selectmap-v1')).toBe('[]');
});
it('ordinary working pages never link into demo pages',async()=>{render(<SelectMap/>);await screen.findByRole('dialog',{name:/Добро пожаловать/});expect([...document.querySelectorAll('a[href]')].some(a=>a.getAttribute('href')?.startsWith('/demo'))).toBe(false)});
