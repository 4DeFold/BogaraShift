import {test} from 'node:test';import assert from 'node:assert/strict';
import {candidatesFromFeeds,findLatestHls,tilePoint,tileUrl} from '../lib/imagery.mjs';
const now=new Date('2026-11-09T12:00:00Z');
const feeds={s30:{feed:{entry:[{time_start:'2026-11-08T08:00:00Z'},{time_start:'2026-11-08T07:00:00Z'},{time_start:'2026-11-04T08:00:00Z'}]}},l30:{feed:{entry:[{time_start:'2026-11-07T09:00:00Z'},{time_start:'2026-11-05T09:00:00Z'}]}}};
const fetcher=async url=>({ok:true,json:async()=>feeds[new URL(url).searchParams.get('short_name')==='HLSS30'?'s30':'l30']});
test('orders NASA candidates across both products, deduplicates days, limits dates and skips future data',()=>{
 const result=candidatesFromFeeds(feeds,now);assert.deepEqual(result.map(x=>[x.sensor,x.date]),[['s30','2026-11-08'],['l30','2026-11-07'],['l30','2026-11-05'],['s30','2026-11-04']]);assert.throws(()=>candidatesFromFeeds({s30:{},l30:feeds.l30},now));
});
test('checks latest candidates first, skipping transparent tiles only',async()=>{
 let visited=[];const result=await findLatestHls(42.4,69.85,{now,fetcher,probe:async(url)=>{visited.push(url);return visited.length===2}});assert.equal(result.date,'2026-11-07');assert.equal(result.sensor,'l30');assert.equal(visited.length,2);assert.match(visited[0],/2026-11-08/);
});
test('never silently substitutes an older scene on network failure',async()=>{let seen=0;await assert.rejects(findLatestHls(42.4,69.85,{now,fetcher,probe:async()=>{seen++;throw Error('offline')}}));assert.equal(seen,1);});
test('returns no imagery when no recent centre pixel exists',async()=>{assert.equal(await findLatestHls(42.4,69.85,{now,fetcher,probe:async()=>false}),null);});
test('generates bounded native 30m GIBS tile coordinates without arbitrary URLs',()=>{const t=tilePoint(42.4,69.85);assert.ok(t.x>=0&&t.x<4096&&t.y>=0&&t.y<4096&&t.px>=0&&t.px<256&&t.py>=0&&t.py<256);assert.throws(()=>tileUrl('evil','2026-01-01',12,1,1));assert.throws(()=>tileUrl('s30','bad',12,1,1));});
test('filters future and old data, and checks at most 30 days',async()=>{
 const many=Array.from({length:45},(_,i)=>({time_start:new Date(now.getTime()-i*86400000).toISOString()}));
 const result=candidatesFromFeeds({s30:{feed:{entry:[{time_start:'2026-11-10T00:00:00Z'},{time_start:'2020-01-01T00:00:00Z'},...many]}},l30:{feed:{entry:[]}}},now);assert.equal(result.length,30);assert.ok(result.every(x=>x.time<=now.getTime()&&x.time>=now.getTime()-90*86400000));
});
test('rejects failed catalog responses instead of claiming coverage',async()=>{await assert.rejects(findLatestHls(42,69,{now,fetcher:async()=>({ok:false}),probe:async()=>true}));});
