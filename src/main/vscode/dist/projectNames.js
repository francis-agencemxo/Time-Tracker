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
exports.deriveProjectNameFromUri = deriveProjectNameFromUri;
exports.deriveProjectNameFromPath = deriveProjectNameFromPath;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
function extractRepoName(remoteUrl) {
    const sanitized = remoteUrl
        .replace(/^git@/, "")
        .replace(/^https?:\/\//, "")
        .replace(/\.git$/, "");
    const segments = sanitized.split("/");
    return segments[segments.length - 1] || sanitized;
}
function deriveProjectNameFromUri(resource, config) {
    switch (config.projectNameStrategy) {
        case "custom": {
            const custom = config.customProjectName?.trim();
            if (custom) {
                return custom;
            }
            break;
        }
        case "gitOrigin": {
            const folder = vscode.workspace.getWorkspaceFolder(resource);
            if (folder) {
                const repoName = deriveProjectNameFromPath(folder.uri.fsPath, config);
                if (repoName) {
                    return repoName;
                }
            }
            break;
        }
        case "workspaceFolder":
        default:
            break;
    }
    const folder = vscode.workspace.getWorkspaceFolder(resource);
    if (folder) {
        return path.basename(folder.uri.fsPath);
    }
    if (vscode.workspace.workspaceFolders?.length) {
        return path.basename(vscode.workspace.workspaceFolders[0].uri.fsPath);
    }
    return null;
}
function deriveProjectNameFromPath(fsPath, config) {
    if (config.projectNameStrategy === "custom") {
        const custom = config.customProjectName?.trim();
        if (custom) {
            return custom;
        }
    }
    if (config.projectNameStrategy === "gitOrigin") {
        try {
            const output = (0, child_process_1.execSync)("git config --get remote.origin.url", {
                cwd: fsPath,
                stdio: ["ignore", "pipe", "ignore"],
            })
                .toString()
                .trim();
            if (output) {
                return extractRepoName(output);
            }
        }
        catch {
            // ignore
        }
    }
    return path.basename(fsPath);
}
//# sourceMappingURL=projectNames.js.map