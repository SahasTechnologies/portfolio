// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Rendered on the VPS behind Caddy: every request picks its pixel animation on
// the server, so a reload shows a different one.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: true, port: Number(process.env.PORT ?? 4321) },
});
