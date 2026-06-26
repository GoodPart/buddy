const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "cesium", "Build", "Cesium");
const dest = path.join(__dirname, "..", "public", "cesium");

if (!fs.existsSync(src)) {
  console.warn("[copy-cesium] cesium package not found, skipping");
  process.exit(0);
}

fs.cpSync(src, dest, { recursive: true });
console.log("[copy-cesium] copied to public/cesium");
