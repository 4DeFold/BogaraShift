// A regular selection grid, not detected agricultural parcels. Decimal degrees are intentional.
export const CELL_SIZE = 0.005;
export function cellAt(lat, lon) {
  const row = Math.floor(lat * 200 + 1e-9), col = Math.floor(lon * 200 + 1e-9);
  return cellFromIndex(row, col);
}
export function cellFromIndex(row, col) {
  const south = row / 200, west = col / 200;
  return { id: `${row}:${col}`, row, col, south, west, north: (row + 1) / 200, east: (col + 1) / 200, lat: south + CELL_SIZE / 2, lon: west + CELL_SIZE / 2 };
}
export const emptyField = cell => ({ cell, name:'', texture:'unknown', drainage:'unknown', drying:'unknown', salinity:'unknown', terrain:'unknown', moisture:'', moistureDate:'', moistureDepth:'', yieldHistory:'', equipment:'', buyer:'', report:null });
export function missingItems(field) {
  return ['texture','drainage','drying','salinity','terrain'].filter(k=>field[k]==='unknown').length + [!field.report, !field.moisture, !field.yieldHistory?.trim(), !field.equipment?.trim(), !field.buyer?.trim()].filter(Boolean).length;
}
