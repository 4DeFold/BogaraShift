// POWER values are daily; only complete March–May windows enter the comparison.
export function summarizePower(parameters) {
  const rain = parameters?.PRECTOTCORR || {};
  const temp = parameters?.T2M_MAX || {};
  const years = [];
  for (let year = 2005; year <= 2024; year++) {
    const dates = Object.keys(rain).filter(d => d.startsWith(String(year)) && +d.slice(4, 6) >= 3 && +d.slice(4, 6) <= 5);
    const valid = dates.filter(d => Number.isFinite(rain[d]) && rain[d] >= 0 && Number.isFinite(temp[d]) && temp[d] > -100);
    if (valid.length !== 92) continue;
    years.push({ year, precipitation: Math.round(valid.reduce((s,d) => s + rain[d], 0) * 10) / 10, hotDays: valid.filter(d => temp[d] >= 30).length });
  }
  if (!years.length) return null;
  const sorted = years.map(y => y.precipitation).sort((a,b) => a-b);
  const m = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[m] : (sorted[m-1] + sorted[m]) / 2;
  const hot = years.map(y => y.hotDays).sort((a,b)=>a-b);
  const hotMedian = hot.length % 2 ? hot[m] : (hot[m-1] + hot[m]) / 2;
  return { years, median: Math.round(median * 10) / 10, below: years.filter(y => y.precipitation < median).length, hotMedian };
}
