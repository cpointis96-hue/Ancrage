import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { createLocalServer } from './http/server.mjs';

const app = createApp();
await app.ready;
const api = createLocalServer({
  app,
  staticRoot: fileURLToPath(new URL('../app/', import.meta.url)),
  port: Number(process.env.PORT || 4173),
});
await api.listen();
console.log(`Ancrage : http://127.0.0.1:${api.server.address().port}`);
