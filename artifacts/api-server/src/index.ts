import path from "path";

try {
  process.loadEnvFile(path.join(__dirname, "../../../.env"));
} catch (e) {
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env"));
  } catch (err) {}
}

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "3001";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
