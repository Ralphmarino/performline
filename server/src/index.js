import { config } from './config.js';
import { createApp } from './app.js';
import { createStore } from './store.js';

const app = createApp({ serveStatic: true, store: createStore() });
app.listen(config.port, () => {
  console.log(`PerformLine Insights server on http://localhost:${config.port}  [${config.mode}] ${config.modeReason}`);
});
