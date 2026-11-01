import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePower} from '../lib/analysis.mjs';
test('complete windows only; missing values are not silently counted',()=>{
 const rain={},temp={}; for(const y of [2005,2006]) for(const [m,n] of [[3,31],[4,30],[5,31]]) for(let d=1;d<=n;d++){const k=`${y}${String(m).padStart(2,'0')}${String(d).padStart(2,'0')}`;rain[k]=y===2005?1:2;temp[k]=31;}
 rain['20060301']=-999;
 const result=summarizePower({PRECTOTCORR:rain,T2M_MAX:temp}); assert.equal(result.years.length,1);assert.equal(result.median,92);assert.equal(result.hotMedian,92);assert.equal(result.below,0);
});
test('empty input has no summary',()=>assert.equal(summarizePower({}),null));
