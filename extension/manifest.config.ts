import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

const WEB_ORIGIN = process.env.VITE_WEB_ORIGIN ?? "https://app.librora.xyz";
const API_ORIGIN = process.env.VITE_API_ORIGIN ?? "https://api.librora.xyz";

export default defineManifest({
  manifest_version: 3,
  name: "Librora — Library Clipper",
  description: "Save the current page to your Librora library in one click.",
  version: pkg.version,
  // Fixed public key so the unpacked dev extension keeps a stable ID across
  // reloads (see extension/dev-key.pem, generated once and gitignored).
  // Omitted when building for the Chrome Web Store — Chrome rejects any
  // manifest containing "key" on upload. Set VITE_EXTENSION_STORE_BUILD=1
  // for the store build.
  ...(process.env.VITE_EXTENSION_STORE_BUILD
    ? {}
    : {
        key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtz6FO1sb8NQg60JRmuiGOW8/U/kHP2mmhHI/fsVC9gTU6gR8no9dM/+tDOEG+4K4Bb8FOFebCjk3pQtDbXgdunFesufo5jpQVFi7J4bMYBac8tlMQbB6FWdcLd7ZGQYZkmXBbB5zOLP9f9bv1EnyAzp5WHtbU+erXmEE9pGEHu+1QmXop8D917MSWJTUCFo2/YU1vQgS7PS4qLT594xVBsF5//cQIwJivXVR+dGR0dw2qj9pHQR3z3A9P7Px8i3CyJrW7DRfl4Ho3UPIeyjObNGLGJS8P2Hf5eX3olniAdhS32oZUsxZMUMc0/T6PCRYLd7Ax3XykT79eCAU1omBdQIDAQAB",
      }),
  icons: {
    16: "src/icons/icon-16.png",
    48: "src/icons/icon-48.png",
    128: "src/icons/icon-128.png",
  },
  action: {
    // Every click opens the popup (chrome.action.onClicked does not fire once
    // default_popup is set — the popup itself drives the save flow instead).
    default_popup: "src/popup/popup.html",
    default_icon: {
      16: "src/icons/icon-16.png",
      48: "src/icons/icon-48.png",
      128: "src/icons/icon-128.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  permissions: ["storage", "activeTab", "notifications", "alarms"],
  host_permissions: [`${API_ORIGIN}/*`],
  externally_connectable: {
    matches: [`${WEB_ORIGIN}/*`],
  },
});
