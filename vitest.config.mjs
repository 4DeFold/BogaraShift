import { defineConfig } from 'vitest/config';
import { transformWithEsbuild } from 'vite';
export default defineConfig({
  plugins: [{name:'jsx-in-app-js', enforce:'pre', async transform(code,id) {
    if (id.endsWith('/app/page.js')) return transformWithEsbuild(code,id,{loader:'jsx',jsx:'automatic'});
  }}],
  test: { environment:'jsdom', include:['tests/*.test.jsx'] }
});
