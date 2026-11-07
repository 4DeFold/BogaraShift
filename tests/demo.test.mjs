import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoFields,DEMO_STORAGE} from '../lib/demo.mjs';
import {geometryForCell,validateGeometry,areaHa} from '../lib/geometry.mjs';
test('ten reproducible fictional fields include usable analysis and unique valid contours',()=>{
 const fields=demoFields(2026);assert.equal(fields.length,10);assert.equal(new Set(fields.map(f=>f.cell.id)).size,10);assert.notEqual(DEMO_STORAGE,'bogarashift-selectmap-v1');
 for(const f of fields){assert.ok(validateGeometry(geometryForCell(f.cell)));assert.ok(areaHa(f.cell)>0.1);assert.ok(f.report.synthetic);assert.ok(f.report.lab.ph>6&&f.report.lab.ph<9);assert.ok(f.report.data.startsWith('data:text/plain;'));assert.ok(f.seasonPlans[2026].A.crop);assert.ok(f.cropHistory[2025]);}
});
