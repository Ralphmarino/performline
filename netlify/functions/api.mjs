/**
 * Netlify Function: the whole Express API (/api/*) wrapped with serverless-http.
 * Reports are read from Netlify Blobs, where the daily `refresh` function stores them.
 */
import serverless from 'serverless-http';
import * as blobs from '@netlify/blobs';
import { createApp } from '../../server/src/app.js';
import { createStore } from '../../server/src/store.js';

let handlerPromise;
async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      const app = createApp({ serveStatic: false, store: createStore({ blobs }) });
      // Netlify rewrites /api/* to /.netlify/functions/api/api/*; strip the function prefix so Express sees /api/*.
      return serverless(app, { basePath: '/.netlify/functions/api' });
    })();
  }
  return handlerPromise;
}

export const handler = async (event, context) => {
  // Lambda-compatible functions must connect Blobs to the request before any store call.
  if (event.blobs) blobs.connectLambda(event);
  const h = await getHandler();
  return h(event, context);
};
