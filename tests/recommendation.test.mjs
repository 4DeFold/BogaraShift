import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestCrop} from '../lib/recommendation.mjs';
test('suggests exactly one preliminary rotation option without changing saved plans',()=>{
 const field={cropHistory:{2025:'wheat'},seasonPlans:{2026:{A:{crop:'safflower'},B:{crop:'alfalfa'}}}};
 assert.deepEqual(suggestCrop(field,2026),{crop:'chickpea',reason:'afterWheat'});
 assert.deepEqual(suggestCrop({cropHistory:{2025:'chickpea'}},2026),{crop:'wheat',reason:'afterChickpea'});
 assert.equal(field.seasonPlans[2026].A.crop,'safflower');assert.equal(field.seasonPlans[2026].B.crop,'alfalfa');
});
test('does not guess with missing or unsupported history, known constraints or recent chickpea',()=>{
 assert.equal(suggestCrop({},2026).reason,'missingHistory');
 assert.equal(suggestCrop({cropHistory:{2025:'alfalfa'}},2026).reason,'unsupportedHistory');
 assert.equal(suggestCrop({cropHistory:{2025:'wheat'},salinity:'yes'},2026).reason,'constraint');
 assert.equal(suggestCrop({cropHistory:{2025:'wheat'},drainage:'standing'},2026).reason,'constraint');
 assert.equal(suggestCrop({cropHistory:{2025:'wheat',2024:'chickpea'}},2026).reason,'recentChickpea');
});
test('all local fallback messages avoid technical rule codes',async()=>{
 const {dashboardText}=await import('../lib/dashboard-text.js');
 for(const lang of ['ru','en','kk']) for(const key of ['wheatAfterWheat','legumeBeforeWheat','fallowRisk']) assert.doesNotMatch(dashboardText[lang][key],/[A-Z]+_[A-Z_]+/);
});
