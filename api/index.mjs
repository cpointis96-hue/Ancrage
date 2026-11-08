import { waitUntil } from '@vercel/functions';
import { createHostedApp } from '../src/hosted-app.mjs';
import { createHostedHandler } from '../src/http/hosted-handler.mjs';

let app;
const getApp = () => app ??= createHostedApp().catch(error => { app = null; throw error; });
export default async function handler(request, response) {
  const origin = process.env.PUBLIC_ORIGIN ?? `https://${process.env.VERCEL_URL}`;
  return createHostedHandler({ getApp, origin, sessionSecret: process.env.PUBLIC_SESSION_SECRET, workerSecret: process.env.CRON_SECRET, operatorPasswordHash: process.env.OPERATOR_PASSWORD_HASH, waitUntil })(request, response);
}
