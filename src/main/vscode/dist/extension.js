"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const database_1 = require("./database");
const sessionTracker_1 = require("./sessionTracker");
const gitTracker_1 = require("./gitTracker");
const licenseStore_1 = require("./licenseStore");
const server_1 = require("./server");
const config_1 = require("./config");
let sessionTracker = null;
let gitTracker = null;
let trackerServer = null;
let database = null;
let licenseStore = null;
let currentConfig = null;
let serverStaticRoot = null;
let configWatcher = null;
async function activate(context) {
    currentConfig = (0, config_1.readConfiguration)();
    try {
        database = new database_1.DatabaseManager();
        if (database.backend === "json") {
            console.warn("CodePulse: running against JSON datastore. Run 'npm run rebuild-native' inside src/main/vscode to build better-sqlite3 for VS Code.");
            vscode.window.showWarningMessage("CodePulse Time Tracker is using the JSON datastore. Rebuild native dependencies (npm run rebuild-native) to share data with PhpStorm.");
        }
        licenseStore = new licenseStore_1.LicenseStore();
        sessionTracker = new sessionTracker_1.SessionTracker(database, currentConfig);
        gitTracker = new gitTracker_1.GitCommitTracker(database, currentConfig);
        const candidateRoots = [
            path.join(context.extensionPath, "dist", "public"),
            path.join(context.extensionPath, "public"),
            path.join(context.extensionPath, "..", "resources", "public"),
        ];
        serverStaticRoot = candidateRoots.find((candidate) => fs.existsSync(candidate)) ?? candidateRoots[0];
        trackerServer = new server_1.TrackerServer(database, licenseStore, currentConfig);
        sessionTracker.activate();
        gitTracker.activate();
        if (currentConfig.autoStartServer) {
            await safeStartServer(currentConfig.trackerServerPort);
        }
    }
    catch (error) {
        console.error("CodePulse: failed to initialise background services", error);
        vscode.window.showErrorMessage("CodePulse Time Tracker failed to start its background services. Dashboard commands remain available; check the extension host logs for details.");
        await deactivate();
    }
    context.subscriptions.push(vscode.commands.registerCommand("codepulseTimeTracker.openDashboard", async () => {
        const url = currentConfig?.dashboardUrl ?? `http://localhost:${currentConfig?.trackerServerPort ?? 56000}`;
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }), vscode.commands.registerCommand("codepulseTimeTracker.restartServer", async () => {
        if (!trackerServer || !currentConfig) {
            vscode.window.showWarningMessage("CodePulse server is not initialised yet.");
            return;
        }
        await safeRestartServer(currentConfig.trackerServerPort);
        vscode.window.showInformationMessage("CodePulse tracker server restarted.");
    }));
    configWatcher = (0, config_1.onConfigurationChange)(async (config) => {
        currentConfig = config;
        sessionTracker?.updateConfiguration(config);
        gitTracker?.updateConfiguration(config);
        trackerServer?.updateConfiguration(config);
        if (config.autoStartServer) {
            await safeRestartServer(config.trackerServerPort);
        }
        else {
            await trackerServer?.stop();
        }
    });
    context.subscriptions.push({ dispose: deactivate });
}
async function deactivate() {
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
async function safeStartServer(port) {
    if (!trackerServer || !serverStaticRoot) {
        return;
    }
    try {
        await trackerServer.start(port, serverStaticRoot);
    }
    catch (error) {
        console.error("CodePulse: failed to start tracker server", error);
        vscode.window.showErrorMessage(`CodePulse tracker server failed to start on port ${port}: ${error}`);
    }
}
async function safeRestartServer(port) {
    if (!trackerServer || !serverStaticRoot) {
        return;
    }
    try {
        await trackerServer.restart(port, serverStaticRoot);
    }
    catch (error) {
        console.error("CodePulse: failed to restart tracker server", error);
        vscode.window.showErrorMessage(`CodePulse tracker server failed to restart on port ${port}: ${error}`);
    }
}
//# sourceMappingURL=extension.js.map