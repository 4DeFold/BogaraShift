import {test} from 'node:test';
import assert from 'node:assert/strict';
import {askZai,modelName,validateAiContext} from '../lib/ai.mjs';
const context={lang:'ru',year:2026,crop:'wheat',texture:'loamy',drainage:'unknown',drying:'unknown',salinity:'unknown',terrain:'unknown',previous:''};
test('AI input rejects unknown values and strips files and identifiers',()=>{
 assert.equal(validateAiContext({...context,crop:'injected'}),null);assert.equal(validateAiContext({...context,lang:'xx'}),null);
 assert.deepEqual(validateAiContext({...context,name:'private',report:'secret',lat:42}),context);
 assert.equal(modelName('https://example.test','glm-5.3'),'glm-5.3');
});
test('AI uses fallback only on unknown model and never sends an attachment',async()=>{
 let calls=[];const fetcher=async(_url,options)=>{calls.push(JSON.parse(options.body));return calls.length===1?{ok:false,status:400,json:async()=>({error:{code:'1211'}})}:{ok:true,json:async()=>({choices:[{message:{content:'Information only'}}]})}};
 const result=await askZai(context,{key:'test-only',fetcher});assert.equal(result.model,'glm-5.2');assert.equal(calls.length,2);assert.equal(calls[0].model,'glm-5.3');assert.equal(calls[1].model,'glm-5.2');assert.ok(!JSON.stringify(calls).includes('report.pdf'));
});
test('AI stops on provider limit or failure without a fallback call',async()=>{
 let count=0;const response=await askZai(context,{key:'test-only',fetcher:async()=>{count++;return {ok:false,status:429,json:async()=>({error:{code:'1113'}})}}});assert.equal(response.error,'LIMIT');assert.equal(count,1);
 const down=await askZai(context,{key:'test-only',fetcher:async()=>{throw Error('offline')}});assert.equal(down.error,'UPSTREAM');
});
