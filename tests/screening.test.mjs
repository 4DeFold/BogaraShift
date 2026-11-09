import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenScenarios} from '../lib/screening.mjs';
test('scenario screening uses explicit history, keeps unknowns and does not pick a winner',()=>{
 const field={cell:{boundaryStatus:'draft'},texture:'unknown',salinity:'unknown',buyer:'',cropHistory:{2025:'wheat'},report:null};
 const out=screenScenarios(field,2026);assert.equal(out.alternatives.length,5);assert.ok(out.alternatives.find(x=>x.crop==='wheat').flags.includes('wheatAfterWheat'));assert.ok(!out.alternatives.find(x=>x.crop==='chickpea').flags.includes('wheatAfterWheat'));assert.ok(out.missing.includes('missingReport'));assert.ok(out.missing.includes('missingObservations'));assert.ok(out.missing.includes('climateNotUsed'));assert.ok(out.missing.includes('missingBoundary'));assert.equal(field.seasonPlans,undefined);
});
test('attached analysis is not misrepresented as parsed laboratory values',()=>{
 const result=screenScenarios({cell:{boundaryStatus:'confirmed'},cropHistory:{2025:'chickpea'},buyer:'yes',report:{name:'report.pdf'},texture:'loamy',salinity:'no',drying:'quick',drainage:'quick',terrain:'level'},2026);
 assert.ok(result.missing.includes('reportNotRead'));assert.ok(!result.missing.includes('missingReport'));assert.ok(result.alternatives.find(x=>x.crop==='wheat').flags.includes('legumeBeforeWheat'));
});
