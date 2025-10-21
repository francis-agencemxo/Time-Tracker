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
exports.readConfiguration = readConfiguration;
exports.onConfigurationChange = onConfigurationChange;
const vscode = __importStar(require("vscode"));
const CONFIG_NAMESPACE = "codepulseTimeTracker";
function readConfiguration() {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return {
        autoStartServer: config.get("autoStartServer", true),
        trackerServerPort: config.get("trackerServerPort", 56000),
        dashboardUrl: config.get("dashboardUrl", "http://localhost:56000") ??
            "http://localhost:56000",
        idleTimeoutMinutes: config.get("idleTimeoutMinutes", 2),
        activitySamplingIntervalSeconds: config.get("activitySamplingIntervalSeconds", 60),
        projectNameStrategy: config.get("projectNameStrategy", "workspaceFolder"),
        customProjectName: config.get("customProjectName", ""),
        storageType: config.get("storageType", "local") ?? "local",
    };
}
function onConfigurationChange(handler) {
    return vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
            handler(readConfiguration());
        }
    });
}
//# sourceMappingURL=config.js.map