// Packages the built extension (extension/dist) into a downloadable zip,
// written straight into frontend/public/ so the marketing site's /extension
// page can link to it directly — no separate hosting/CI step needed.
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const here = dirname(fileURLToPath(import.meta.url));
const extensionRoot = join(here, "..");
const distDir = join(extensionRoot, "dist");
const outDir = join(extensionRoot, "..", "frontend", "public");
const outFile = join(outDir, "librora-clipper.zip");

if (!existsSync(distDir)) {
  console.error('extension/dist not found — run "bun run build" first.');
  process.exit(1);
}

const manifest = JSON.parse(await readFile(join(distDir, "manifest.json"), "utf8"));
const declaredHosts = [
  ...(manifest.host_permissions ?? []),
  ...(manifest.externally_connectable?.matches ?? []),
];
const hasLocalOrigin = declaredHosts.some((host) =>
  /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(host),
);
if (hasLocalOrigin && process.env.ALLOW_LOCAL_EXTENSION_ZIP !== "1") {
  console.error(
    "Refusing to package an extension zip with localhost origins. Set VITE_API_ORIGIN and VITE_WEB_ORIGIN for production, or ALLOW_LOCAL_EXTENSION_ZIP=1 for local testing.",
  );
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Wrote ${outFile} (${archive.pointer()} bytes)`);
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(distDir, false);
await archive.finalize();
