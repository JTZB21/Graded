import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A visible build label, so a phone install can be checked against the GitHub Actions run that made it.
const run = process.env.GITHUB_RUN_NUMBER;
const sha = process.env.GITHUB_SHA?.slice(0, 7);
const BUILD = run ? `build ${run}${sha ? ` · ${sha}` : ''}` : 'dev build';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app also loads inside the Android wrapper.
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
});
