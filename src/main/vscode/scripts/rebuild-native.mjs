import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const cwd = extensionRoot;

function detectElectronVersion() {
  const executables = new Set();
  if (process.env.CODEPULSE_VSCODE_BIN) {
    executables.add(process.env.CODEPULSE_VSCODE_BIN);
  }
  if (process.env.VSCODE_PORTABLE) {
    executables.add(process.env.VSCODE_PORTABLE);
  }

  if (process.platform === "win32") {
    executables.add("code.cmd");
    executables.add("code-insiders.cmd");
    executables.add("Code.exe");
    executables.add("Code - Insiders.exe");
  } else {
    executables.add("code");
    executables.add("code-insiders");
  }

  const parse = (output) => {
    if (!output) {
      return null;
    }
    const match = output.match(/Electron[:\s]+([\d.]+)/i);
    if (match) {
      return match[1];
    }
    return null;
  };

  for (const exe of executables) {
    try {
      const result = spawnSync(exe, ["--status"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (result.status === 0) {
        const version =
          parse(result.stdout) || parse(result.stderr);
        if (version) {
          return { version, from: exe };
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return null;
}

const detectedElectron = detectElectronVersion();

const electronVersion =
  process.env.CODEPULSE_ELECTRON_VERSION ||
  detectedElectron?.version ||
  process.env.VSCODE_ELECTRON_VERSION ||
  "25.9.7";

if (!process.env.CODEPULSE_ELECTRON_VERSION && detectedElectron?.version) {
  console.log(
    `CodePulse: detected VS Code Electron ${detectedElectron.version} via ${detectedElectron.from}.`,
  );
}

const skip =
  process.env.CODEPULSE_SKIP_NATIVE_REBUILD === "1" ||
  process.env.CODEPULSE_SKIP_NATIVE_REBUILD === "true";

if (skip) {
  console.warn("CodePulse: skipping better-sqlite3 rebuild (requested).");
  process.exit(0);
}

async function main() {
  try {
    const { rebuild } = await import("electron-rebuild");
    await rebuild({
      buildPath: extensionRoot,
      electronVersion,
      onlyModules: ["better-sqlite3"],
      force: true,
    });
    console.log(
      `CodePulse: rebuilt better-sqlite3 for Electron ${electronVersion}.`,
    );
  } catch (error) {
    console.error(
      "CodePulse: failed to rebuild better-sqlite3 for Electron. " +
        "The extension will fall back to JSON storage unless the native module is built. " +
        "Set CODEPULSE_SKIP_NATIVE_REBUILD=1 to bypass.",
      error,
    );
    process.exit(1);
  }
}

main();
