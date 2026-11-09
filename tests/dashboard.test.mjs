import test from 'node:test';
import assert from 'node:assert/strict';
import {areaHa,geometryForCell,validateGeometry,exportGeoJSON,importGeoJSON,leafletGeometry} from '../lib/geometry.mjs';
import {plannedCrop,withCrop,checks,csvCell,occupancyError,economics} from '../lib/dashboard.mjs';
import {gridKey,climateMetrics,climateWindow} from '../lib/climate.mjs';
const square=(x,y,d=.01)=>[[x,y],[x+d,y],[x+d,y+d],[x,y+d],[x,y]];
test('GeoJSON polygon and multipolygon, holes, legacy conversion and draft import',()=>{
 const p={type:'Polygon',coordinates:[square(69,42),square(69.002,42.002,.002)]};
 assert.equal(validateGeometry(p),true);
 assert.ok(areaHa({geometry:p})>80&&areaHa({geometry:p})<100);
 assert.equal(validateGeometry({type:'Polygon',coordinates:[square(69,42),square(70,42)]}),false);
 const multi={type:'MultiPolygon',coordinates:[[square(69,42)],[square(69.02,42)]]};assert.equal(validateGeometry(multi),true);
 assert.equal(leafletGeometry({geometry:multi}).length,2);
 assert.equal(validateGeometry({type:'MultiPolygon',coordinates:[[square(69,42)],[square(69.005,42)]]}),false);
 const legacy={south:42,west:69,north:42.01,east:69.01};assert.deepEqual(geometryForCell(legacy).coordinates[0][0],[69,42]);
 const exported=exportGeoJSON([{name:'Field',cell:{geometry:multi}}]);const [imported]=importGeoJSON(exported);assert.equal(imported.cell.boundaryStatus,'draft');assert.deepEqual(imported.cell.geometry,multi);
});
test('invalid topology and undersized contours are rejected',()=>{
 const bow={type:'Polygon',coordinates:[[[69,42],[69.01,42.01],[69,42.01],[69.01,42],[69,42]]]};assert.equal(validateGeometry(bow),false);
 assert.equal(validateGeometry({type:'Polygon',coordinates:[square(69,42,.00001)]}),false);
 assert.equal(validateGeometry({type:'Polygon',coordinates:[[[179,42],[-179,42],[-179,43],[179,42]]]}),false);
 assert.throws(()=>importGeoJSON({type:'FeatureCollection',features:[{type:'Feature',geometry:bow}]}));
});
test('seasons and scenarios remain distinct and previous crop is explicit',()=>{
 let f={plannedCrop:'wheat',salinity:'unknown',buyer:'',cropHistory:{2025:'wheat'}};f=withCrop(f,2026,'A','chickpea');f=withCrop(f,2026,'B','wheat');
 assert.equal(plannedCrop(f,2026,'A'),'chickpea');assert.equal(plannedCrop(f,2026,'B'),'wheat');assert.equal(plannedCrop(f,2025,'A'),'');assert.equal(f.plannedCrop,'wheat');
 assert.ok(checks({...f,displayCrop:'wheat'},2026).includes('wheatAfterWheat'));assert.ok(!checks({...f,cropHistory:{},displayCrop:'wheat'},2026).includes('wheatAfterWheat'));
 assert.equal(csvCell('=2+2'),`"'=2+2"`);
});
test('calendar handles winter and multiyear intervals, rejects inclusive overlap',()=>{
 const f={seasonPlans:{2026:{A:{crop:'wheat',occupancyCrop:'wheat',occupancyStart:'2025-10-01',occupancyEnd:'2026-07-01'}}}};
 assert.equal(occupancyError(f,2027,'A','2026-07-01','2029-07-01'),'overlap');assert.equal(occupancyError(f,2027,'A','2026-07-02','2029-07-01'),null);
 assert.equal(occupancyError(f,2027,'B','2026-07-01','2029-07-01'),null);assert.equal(occupancyError(f,2027,'A','2026-02-30','2027-01-01'),'dates');
});
test('economics never replaces missing with zero and handles division by zero',()=>{
 const d={yieldLow:'1',yieldBase:'2',yieldHigh:'3',priceLow:'100',priceBase:'200',priceHigh:'300',cost:'120'};
 const r=economics(d,10);assert.deepEqual(r.margins,[-20,280,780]);assert.deepEqual(r.totals,[-200,2800,7800]);assert.equal(r.breakEvenYield,.6);assert.equal(r.breakEvenPrice,60);
 assert.equal(economics({...d,cost:''},10),null);assert.equal(economics({...d,yieldHigh:'1'},10),null);assert.equal(economics({...d,priceLow:'0',priceBase:'0'},10).breakEvenYield,null);
});
test('POWER missing values stay missing, break dry runs, and grids deduplicate',()=>{
 assert.deepEqual(gridKey(42.4,69.85),gridKey(42.41,69.84));
 const data={properties:{parameter:{PRECTOTCORR:{20250101:0,20250102:-999,20250103:0},T2M_MAX:{20250101:31,20250102:-999,20250103:20}}}};
 assert.deepEqual(climateMetrics(data,'20250101','20250103'),{days:3,rainDays:2,tempDays:2,precipMm:0,hotDays:1,dryDays:1});
 assert.equal(climateWindow(2030,new Date('2026-11-05T00:00:00Z')),null);
 assert.equal(climateWindow(2026,new Date('2026-11-05T00:00:00Z')).end,'20261029');
});
