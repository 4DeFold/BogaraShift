import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import AiExplanation from '../app/components/AiExplanation';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const field={displayCrop:'wheat',texture:'loamy',drainage:'unknown',drying:'unknown',salinity:'unknown',terrain:'unknown',buyer:'',cropHistory:{2025:'wheat'}};
it('requests an AI explanation without any account or authorization header',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({answer:'Пример ответа',model:'gemini-test'})});vi.stubGlobal('fetch',fetcher);render(<AiExplanation field={field} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText('Пример ответа');expect(fetcher).toHaveBeenCalledOnce();const opts=fetcher.mock.calls[0][1];expect(opts.headers.Authorization).toBeUndefined();expect(JSON.parse(opts.body).crop).toBe('wheat');
});
it('shows clearly labelled local checks when the provider or quota is unavailable',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:429}));render(<AiExplanation field={field} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText(/не ответ ИИ/);expect(screen.getByText(/повтор пшеницы может повысить риск/)).toBeTruthy();
});
it('shows an actionable configuration error without requiring sign-in',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:503,json:async()=>({error:'NOT_CONFIGURED'})}));render(<AiExplanation field={field} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText(/ИИ не настроен в этом развёртывании/);expect(screen.getByText(/не ответ ИИ/)).toBeTruthy();
});
it('shows only the actual data sent to Gemini and flags unprovided datasets',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({answer:'Ответ',model:'gemini-test'})});vi.stubGlobal('fetch',fetcher);render(<AiExplanation field={{...field,report:{name:'private.pdf'}}} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText('Данные для объяснения');expect(screen.getByText('Год уборки: 2026')).toBeTruthy();expect(screen.getByText('Предыдущая культура: Озимая пшеница')).toBeTruthy();expect(screen.getByText('Тип почвы: Суглинистая')).toBeTruthy();expect(screen.getByText(/Файл анализа почвы и данные NASA не передавались/)).toBeTruthy();expect(fetcher.mock.calls[0][1].body).not.toContain('private.pdf');
});
it('clears an earlier explanation when inputs change',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({answer:'Старый ответ',model:'test'})}));const {rerender}=render(<AiExplanation field={field} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText('Старый ответ');rerender(<AiExplanation field={{...field,salinity:'yes'}} year={2026} lang="ru"/>);expect(screen.queryByText('Старый ответ')).toBeNull();expect(screen.queryByText('Данные для объяснения')).toBeNull();
});
