import {test} from 'node:test';import assert from 'node:assert/strict';
import {candidatesFromFeeds,findHls2025,tilePoint,tileUrl} from '../lib/imagery.mjs';
const feeds={s30:{feed:{entry:[{time_start:'2025-09-27T08:00:00Z',cloud_cover:'4'},{time_start:'2025-09-27T07:00:00Z',cloud_cover:'5'},{time_start:'2025-05-25T08:00:00Z',cloud_cover:'1'},{time_start:'2025-09-26T08:00:00Z',cloud_cover:'80'}]}},l30:{feed:{entry:[{time_start:'2025-07-07T09:00:00Z',cloud_cover:'2'},{time_start:'2025-12-05T09:00:00Z',cloud_cover:'0'}]}}};
const fetcher=async url=>({ok:true,json:async()=>feeds[new URL(url).searchParams.get('short_name')==='HLSS30'?'s30':'l30']});
test('prefers lower granule cloud cover and growing season, deduplicates days and filters non-2025',()=>{
 const result=candidatesFromFeeds(feeds);assert.deepEqual(result.map(x=>[x.sensor,x.date,x.cloud]),[['l30','2025-12-05',0],['s30','2025-05-25',1],['l30','2025-07-07',2],['s30','2025-09-27',4]]);assert.throws(()=>candidatesFromFeeds({s30:{},l30:feeds.l30}));
});
test('requests 2025 and cloud filter, then skips transparent tiles',async()=>{
 const visited=[],urls=[];const result=await findHls2025(42.4,69.85,{fetcher:async url=>{urls.push(new URL(url));return fetcher(url)},probe:async url=>{visited.push(url);return visited.length===2}});assert.equal(result.date,'2025-05-25');assert.equal(result.sensor,'s30');assert.equal(visited.length,2);assert.match(visited[0],/2025-12-05/);assert.ok(urls.every(u=>u.searchParams.get('cloud_cover')==='0,10'&&u.searchParams.get('temporal').startsWith('2025-01-01')));
});
test('does not treat missing or invalid cloud metadata as cloud free',()=>{
 const result=candidatesFromFeeds({s30:{feed:{entry:[{time_start:'2025-06-01',cloud_cover:null},{time_start:'2025-06-02',cloud_cover:''},{time_start:'2025-06-03',cloud_cover:'-1'},{time_start:'2025-06-04',cloud_cover:'11'},{time_start:'2026-01-01',cloud_cover:0},{time_start:'2024-12-31',cloud_cover:0}]}},l30:{feed:{entry:[]}}});assert.deepEqual(result,[]);
});
test('never silently substitutes another scene on network failure',async()=>{let seen=0;await assert.rejects(findHls2025(42.4,69.85,{fetcher,probe:async()=>{seen++;throw Error('offline')}}));assert.equal(seen,1);});
test('returns no imagery when no candidate centre pixel exists',async()=>{assert.equal(await findHls2025(42.4,69.85,{fetcher,probe:async()=>false}),null);});
test('generates bounded native 30m GIBS tile coordinates without arbitrary URLs',()=>{const t=tilePoint(42.4,69.85);assert.ok(t.x>=0&&t.x<4096&&t.y>=0&&t.y<4096&&t.px>=0&&t.px<256&&t.py>=0&&t.py<256);assert.throws(()=>tileUrl('evil','2025-01-01',12,1,1));assert.throws(()=>tileUrl('s30','bad',12,1,1));});
test('checks at most 30 scene dates and prefers the agricultural season',()=>{
 const start=Date.parse('2025-05-01T12:00:00Z');const many=Array.from({length:45},(_,i)=>({time_start:new Date(start+i*86400000).toISOString(),cloud_cover:0}));
 const result=candidatesFromFeeds({s30:{feed:{entry:many}},l30:{feed:{entry:[]}}});assert.equal(result.length,30);assert.ok(result.every(x=>x.season));
});
test('rejects failed catalog responses instead of claiming coverage',async()=>{await assert.rejects(findHls2025(42,69,{fetcher:async()=>({ok:false}),probe:async()=>true}));});
