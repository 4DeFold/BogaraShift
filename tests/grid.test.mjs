import test from 'node:test';
import assert from 'node:assert/strict';
import {cellAt,cellFromIndex,emptyField,missingItems,CELL_SIZE} from '../lib/grid.mjs';
test('same location always resolves to same grid cell, including negative coordinates',()=>{
 for(const [lat,lon] of [[42.4,69.85],[-42.4,-69.85],[0,0],[84.99,179.99]]) {const c=cellAt(lat,lon);assert.ok(c.south<=lat&&lat<c.north);assert.ok(c.west<=lon&&lon<c.east);assert.equal(cellAt(c.lat,c.lon).id,c.id);assert.equal(cellFromIndex(c.row,c.col).id,c.id);assert.ok(Math.abs(c.north-c.south-CELL_SIZE)<1e-10);}
});
test('unknown answers and absent optional data stay unknown',()=>{const f=emptyField(cellAt(42.4,69.85));assert.equal(missingItems(f),10);assert.equal(f.texture,'unknown');assert.equal(f.report,null);f.texture='loamy';f.buyer='Buyer';assert.equal(missingItems(f),8);});
