import path from "node:path";
import { existsSync } from "node:fs";

export const DATA_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../data",
);

if (!existsSync(DATA_DIR)) {
  throw new Error(`Data directory not found: ${DATA_DIR}`);
}
