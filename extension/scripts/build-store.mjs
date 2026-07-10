// Production build for Chrome Web Store submission: strips the dev-only
// "key" field from the manifest (see manifest.config.ts), which Chrome
// rejects on upload with "key field is not allowed in manifest".
import { execSync } from "node:child_process";

execSync("vite build", {
  stdio: "inherit",
  env: { ...process.env, VITE_EXTENSION_STORE_BUILD: "1" },
});
