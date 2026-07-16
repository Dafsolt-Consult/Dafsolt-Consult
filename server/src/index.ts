import { createApp } from "./app";
import { env } from "./config/env";
import { ensureSuperAdmin } from "./bootstrap";
import { startScheduler } from "./scheduler";

const app = createApp();

ensureSuperAdmin()
  .catch((err) => {
    console.error("Failed to ensure SUPER_ADMIN account exists:", err);
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`School Manager API listening on port ${env.port} [${env.nodeEnv}]`);
    });
    startScheduler();
  });
