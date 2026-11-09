import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen,waitFor} from '@testing-library/react';
import ClimatePanel from '../app/components/ClimatePanel';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('loads climate automatically and updates for a different season without a loading button',async()=>{
 const fetcher=vi.fn().mockImplementation(async url=>({ok:true,json:async()=>({source:'test',grid:{lat:42.5,lon:70},window:{start:'20250101',end:'20251231'},metrics:{precipMm:url.includes('year=2025')?42:12,hotDays:4,dryDays:3,rainDays:5,tempDays:5,days:5}})}));vi.stubGlobal('fetch',fetcher);
 const field={cell:{lat:42.4,lon:69.85}};const {rerender}=render(<ClimatePanel field={field} year={2025} lang="ru"/>);
 await screen.findByText(/Осадки, сумма доступных дней: 42/);expect(screen.queryByRole('button',{name:/Загрузить климат/})).toBeNull();expect(fetcher).toHaveBeenCalledOnce();
 rerender(<ClimatePanel field={field} year={2024} lang="ru"/>);await screen.findByText(/Осадки, сумма доступных дней: 12/);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not show an older response if the user switches field or year',async()=>{
 const resolvers=[];vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>resolvers.push(resolve))));const {rerender}=render(<ClimatePanel field={{cell:{lat:42,lon:70}}} year={2025} lang="ru"/>);rerender(<ClimatePanel field={{cell:{lat:43,lon:70}}} year={2024} lang="ru"/>);
 const data=n=>({ok:true,json:async()=>({source:'test',grid:{lat:42,lon:70},window:{start:'x',end:'y'},metrics:{precipMm:n,days:1,rainDays:1,tempDays:1}})});
 resolvers[1](data(12));await screen.findByText(/Осадки, сумма доступных дней: 12/);resolvers[0](data(99));await waitFor(()=>expect(screen.queryByText(/Осадки, сумма доступных дней: 99/)).toBeNull());
});
