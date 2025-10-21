import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DatabaseManager } from "./database";
import { SessionTracker } from "./sessionTracker";
import { GitCommitTracker } from "./gitTracker";
import { LicenseStore } from "./licenseStore";
import { TrackerServer } from "./server";
import {
  readConfiguration,
  onConfigurationChange,
  TrackerConfiguration,
} from "./config";

let sessionTracker: SessionTracker | null = null;
let gitTracker: GitCommitTracker | null = null;
let trackerServer: TrackerServer | null = null;
let database: DatabaseManager | null = null;
let licenseStore: LicenseStore | null = null;
let currentConfig: TrackerConfiguration | null = null;
let serverStaticRoot: string | null = null;
let configWatcher: vscode.Disposable | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  currentConfig = readConfiguration();
  try {
    database = new DatabaseManager();
    if (database.backend === "json") {
      console.warn("CodePulse: running against JSON datastore. Run 'npm run rebuild-native' inside src/main/vscode to build better-sqlite3 for VS Code.");
      vscode.window.showWarningMessage("CodePulse Time Tracker is using the JSON datastore. Rebuild native dependencies (npm run rebuild-native) to share data with PhpStorm.");
    }
    licenseStore = new LicenseStore();
    sessionTracker = new SessionTracker(database, currentConfig);
    gitTracker = new GitCommitTracker(database, currentConfig);

    const candidateRoots = [
      path.join(context.extensionPath, "dist", "public"),
      path.join(context.extensionPath, "public"),
      path.join(context.extensionPath, "..", "resources", "public"),
    ];
    serverStaticRoot = candidateRoots.find((candidate) => fs.existsSync(candidate)) ?? candidateRoots[0];
    trackerServer = new TrackerServer(database, licenseStore, currentConfig);

    sessionTracker.activate();
    gitTracker.activate();

    if (currentConfig.autoStartServer) {
      await safeStartServer(currentConfig.trackerServerPort);
    }
  } catch (error) {
    console.error("CodePulse: failed to initialise background services", error);
    vscode.window.showErrorMessage("CodePulse Time Tracker failed to start its background services. Dashboard commands remain available; check the extension host logs for details.");
    await deactivate();
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("codepulseTimeTracker.openDashboard", async () => {
      const url = currentConfig?.dashboardUrl ?? `http://localhost:${currentConfig?.trackerServerPort ?? 56000}`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),
    vscode.commands.registerCommand("codepulseTimeTracker.restartServer", async () => {
      if (!trackerServer || !currentConfig) {
        vscode.window.showWarningMessage("CodePulse server is not initialised yet.");
        return;
      }
      await safeRestartServer(currentConfig.trackerServerPort);
      vscode.window.showInformationMessage("CodePulse tracker server restarted.");
    }),
  );

  configWatcher = onConfigurationChange(async (config) => {
    currentConfig = config;
    sessionTracker?.updateConfiguration(config);
    gitTracker?.updateConfiguration(config);
    trackerServer?.updateConfiguration(config);

    if (config.autoStartServer) {
      await safeRestartServer(config.trackerServerPort);
    } else {
      await trackerServer?.stop();
    }
  });

  context.subscriptions.push({ dispose: deactivate });
}

export async function deactivate(): Promise<void> {
  configWatcher?.dispose();
  configWatcher = null;
  await trackerServer?.stop();
  trackerServer = null;
  sessionTracker?.dispose();
  sessionTracker = null;
  gitTracker?.dispose();
  gitTracker = null;
  database = null;
  licenseStore = null;
}

async function safeStartServer(port: number): Promise<void> {
  if (!trackerServer || !serverStaticRoot) {
    return;
  }
  try {
    await trackerServer.start(port, serverStaticRoot);
  } catch (error) {
    console.error("CodePulse: failed to start tracker server", error);
    vscode.window.showErrorMessage(`CodePulse tracker server failed to start on port ${port}: ${error}`);
  }
}

async function safeRestartServer(port: number): Promise<void> {
  if (!trackerServer || !serverStaticRoot) {
    return;
  }
  try {
    await trackerServer.restart(port, serverStaticRoot);
  } catch (error) {
    console.error("CodePulse: failed to restart tracker server", error);
    vscode.window.showErrorMessage(`CodePulse tracker server failed to restart on port ${port}: ${error}`);
  }
}
