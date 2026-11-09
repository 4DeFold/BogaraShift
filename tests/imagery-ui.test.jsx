import React,{useState} from 'react';import {afterEach,expect,it,vi} from 'vitest';import {cleanup,render,screen,waitFor} from '@testing-library/react';
import useLatestHls,{probeHlsTile} from '../app/components/useLatestHls';
vi.mock('../lib/imagery.mjs',async importOriginal=>({...await importOriginal(),findLatestHls:vi.fn()}));
import {findLatestHls} from '../lib/imagery.mjs';
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()});
function Test(){const [p,setP]=useState({lat:42,lon:69});const state=useLatestHls(p);return <><span>{state.status}{state.date||''}</span><button onClick={()=>setP({lat:43,lon:70})}>move</button></>}
it('returns unavailable rather than a fabricated date on lookup failure',async()=>{findLatestHls.mockRejectedValueOnce(Error('offline'));render(<Test/>);expect(screen.getByText('loading')).toBeTruthy();await waitFor(()=>expect(screen.getByText('error')).toBeTruthy(),{timeout:2000});});
it('treats 404 as absent coverage and other status errors as failures',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({status:404,ok:false}).mockResolvedValueOnce({status:503,ok:false}));let signal=new AbortController().signal;expect(await probeHlsTile('https://example.test/tile',{px:0,py:0},signal)).toBe(false);await expect(probeHlsTile('https://example.test/tile',{px:0,py:0},signal)).rejects.toThrow();});
