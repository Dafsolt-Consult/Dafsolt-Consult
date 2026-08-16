import { createApp } from "./app";
import { env } from "./config/env";
import { ensurePlatformOwner } from "./bootstrap";
import { startScheduler } from "./scheduler";

const app = createApp();

ensurePlatformOwner()
  .catch((err) => {
    console.error("Failed to ensure platform admin account exists:", err);
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`DAFSOLT OS API listening on port ${env.port} [${env.nodeEnv}]`);
    });
    startScheduler();
  });
