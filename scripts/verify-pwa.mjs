import fs from "node:fs";

const manifestPath = "dist/manifest.webmanifest";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = [];
if (manifest.name !== "LootRadar") errors.push("name");
if (manifest.display !== "standalone") errors.push("display");
if (manifest.lang !== "zh-Hant") errors.push("lang");
if (!manifest.icons?.some((icon) => icon.sizes === "192x192")) errors.push("icon-192");
if (!manifest.icons?.some((icon) => icon.sizes === "512x512")) errors.push("icon-512");
if (!fs.existsSync("dist/sw.js") && !fs.existsSync("dist/service-worker.js")) errors.push("service-worker");
if (!fs.existsSync("dist/index.html")) errors.push("index");
const sw = fs.existsSync("dist/sw.js") ? fs.readFileSync("dist/sw.js", "utf8") : "";
if (!sw.includes("index.html") && !fs.existsSync("dist/workbox-")) {
  const files = fs.readdirSync("dist");
  if (!files.some((file) => file.includes("workbox"))) errors.push("workbox");
}
if (errors.length) {
  console.error(errors.join(","));
  process.exit(1);
}
console.log("pwa ok");
