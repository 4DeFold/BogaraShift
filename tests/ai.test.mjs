import {test} from 'node:test';
import assert from 'node:assert/strict';
import {askGemini,modelName,validateAiContext} from '../lib/ai.mjs';
const context={lang:'ru',year:2026,crop:'wheat',texture:'loamy',drainage:'unknown',drying:'unknown',salinity:'unknown',terrain:'unknown',previous:''};
test('AI input rejects unknown values and strips files and identifiers',()=>{
 assert.equal(validateAiContext({...context,crop:'injected'}),null);assert.equal(validateAiContext({...context,lang:'xx'}),null);
 assert.deepEqual(validateAiContext({...context,name:'private',report:'secret',lat:42}),context);
 assert.equal(modelName('https://example.test','gemini-3.5-flash-lite'),'gemini-3.5-flash-lite');
});
test('Gemini uses server-side header authentication and sends only selected context',async()=>{
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');assert.equal(options.headers['x-goog-api-key'],'test-only');assert.ok(!url.includes('test-only'));const body=JSON.parse(options.body);assert.equal(body.generationConfig.thinkingConfig.thinkingLevel,'MINIMAL');assert.equal(body.generationConfig.maxOutputTokens,2048);assert.equal(JSON.parse(body.contents[0].parts[0].text).crop,'wheat');assert.ok(!JSON.stringify(body).includes('report.pdf'));return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'Information only'}]}}]})}};
 const result=await askGemini(context,{key:'test-only',fetcher});assert.deepEqual(result,{answer:'Information only',model:'gemini-3.5-flash-lite'});assert.equal(calls,1);
});
test('maps provider limits and errors without exposing response bodies or retrying',async()=>{
 for(const [status,payload,expected] of [[429,{},'LIMIT'],[401,{},'AUTH'],[403,{},'AUTH'],[404,{},'MODEL'],[400,{error:{details:[{reason:'API_KEY_INVALID'}]}},'AUTH'],[500,{error:{message:'private'}},'UPSTREAM']]){let count=0;const result=await askGemini(context,{key:'test-only',fetcher:async()=>{count++;return {ok:false,status,json:async()=>payload}}});assert.deepEqual(result,{error:expected});assert.equal(count,1);}
 const down=await askGemini(context,{key:'test-only',fetcher:async()=>{throw Error('offline')}});assert.equal(down.error,'UPSTREAM');
});
test('rejects truncated, blocked and empty responses instead of showing a partial answer',async()=>{
 for(const candidate of [{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}},{finishReason:'SAFETY',content:{parts:[{text:'unsafe'}]}},{finishReason:'STOP',content:{parts:[{thought:true,text:'internal'}]}}]){const result=await askGemini(context,{key:'test-only',fetcher:async()=>({ok:true,json:async()=>({candidates:[candidate]})})});assert.equal(result.error,candidate.finishReason==='MAX_TOKENS'?'INCOMPLETE':'UPSTREAM');}
});
test('configures 2.5 Flash thinking separately when selected',async()=>{
 let body;await askGemini(context,{key:'test-only',model:'gemini-2.5-flash',fetcher:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:'ok'}]}}]})}}});assert.deepEqual(body.generationConfig.thinkingConfig,{thinkingBudget:0});
});
