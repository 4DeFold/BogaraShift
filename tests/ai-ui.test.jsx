import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import AiExplanation from '../app/components/AiExplanation';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const field={displayCrop:'wheat',texture:'loamy',drainage:'unknown',drying:'unknown',salinity:'unknown',terrain:'unknown',buyer:'',cropHistory:{2025:'wheat'}};
it('requests an AI explanation without any account or authorization header',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({answer:'Пример ответа',model:'glm-test'})});vi.stubGlobal('fetch',fetcher);render(<AiExplanation field={field} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText('Пример ответа');expect(fetcher).toHaveBeenCalledOnce();const opts=fetcher.mock.calls[0][1];expect(opts.headers.Authorization).toBeUndefined();expect(JSON.parse(opts.body).crop).toBe('wheat');
});
it('shows clearly labelled local checks when the provider or quota is unavailable',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:429}));render(<AiExplanation field={field} year={2026} lang="ru"/>);fireEvent.click(screen.getByRole('button',{name:'Получить объяснение'}));await screen.findByText(/не ответ ИИ/);expect(screen.getByText(/повтор пшеницы может повысить риск/)).toBeTruthy();
});
