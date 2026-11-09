import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCloudFields,hydrateCloudFields} from '../lib/cloud.mjs';
import {planningArea} from '../lib/dashboard.mjs';
const cell={id:'a',lat:42.4,lon:69.8,polygon:[[42.4,69.8],[42.4,69.81],[42.41,69.81],[42.41,69.8]],source:'manual'};
test('cloud transfer excludes attachments and preserves independent local data',()=>{
 const field={name:'Test',cell,report:{name:'secret.pdf',data:'data:application/pdf;base64,cGRm'},texture:'unknown',seasonPlans:{2026:{A:{crop:'wheat'}}}};
 const [sent]=prepareCloudFields([field]);assert.equal('report' in sent,false);assert.equal(field.report.name,'secret.pdf');assert.equal(sent.cell.geometry.coordinates[0][0][0],69.8);
 const [received]=hydrateCloudFields([{payload:{...sent,cell:{id:'a'}},geometry:sent.cell.geometry,area_ha:91.3,lat:42.405,lon:69.805,source:'manual',status:'draft'}]);
 assert.equal(received.report,null);assert.equal(received.seasonPlans[2026].A.crop,'wheat');assert.equal(received.cell.geometry.type,'Polygon');assert.equal(planningArea(received.cell),91.3);const altered={...received.cell,geometry:{...received.cell.geometry,coordinates:[received.cell.geometry.coordinates[0].map(([x,y])=>[x+0.001,y])]}};assert.notEqual(planningArea(altered),91.3);
});
test('legacy cloud geometry stays a draft and is excluded from area totals',()=>{
 const legacy={id:'old',lat:42.4025,lon:69.8025,south:42.4,north:42.405,west:69.8,east:69.805,boundaryStatus:'confirmed'};
 const [sent]=prepareCloudFields([{name:'Legacy',cell:legacy}]);assert.equal(sent.cell.source,'legacy');assert.equal(sent.cell.boundaryStatus,'draft');
 const [received]=hydrateCloudFields([{payload:{name:'Legacy',cell:{id:'old'}},geometry:sent.cell.geometry,area_ha:20,lat:42.4025,lon:69.8025,source:'legacy',status:'draft'}]);assert.equal(planningArea(received.cell),null);
});
test('invalid fields and duplicate ids fail without partial upload',()=>{
 assert.throws(()=>prepareCloudFields([{name:'A',cell},{name:'B',cell}]));assert.throws(()=>prepareCloudFields([{name:'A',cell:{...cell,polygon:[[1,2],[3,4],[5,6]]}}]));assert.throws(()=>hydrateCloudFields([{payload:{cell:{id:'a'}},geometry:null}]));
});
