import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const destination = path.join(extensionRoot, "dist", "public");

const candidateSources = [
  path.resolve(extensionRoot, "..", "resources", "public"),
  path.resolve(extensionRoot, "..", "..", "resources", "public"),
];

const source = candidateSources.find((candidate) => fs.existsSync(candidate));

if (!source) {
  console.warn(
    `CodePulse: skipped dashboard asset sync. Could not locate resources/public from ${extensionRoot}`,
  );
  process.exit(0);
}

function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(destination)) {
  fs.rmSync(destination, { recursive: true, force: true });
}

copyDir(source, destination);
