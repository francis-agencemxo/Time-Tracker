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
exports.SessionTracker = void 0;
const vscode = __importStar(require("vscode"));
const projectNames_1 = require("./projectNames");
class SessionTracker {
    constructor(database, config) {
        this.database = database;
        this.disposables = [];
        this.intervalHandle = null;
        this.lastActivity = Date.now();
        this.context = {};
        this.config = config;
    }
    activate() {
        this.trackActiveEditor(vscode.window.activeTextEditor);
        this.registerListeners();
        this.restartInterval();
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }
    updateConfiguration(config) {
        this.config = config;
        this.restartInterval();
    }
    registerListeners() {
        this.disposables.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.trackActiveEditor(editor);
        }), vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) {
                this.bumpActivity();
            }
        }), vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document === vscode.window.activeTextEditor?.document) {
                this.bumpActivity();
            }
        }), vscode.workspace.onDidSaveTextDocument((document) => {
            this.bumpActivity();
            this.recordFileSave(document);
        }), vscode.workspace.onDidOpenTextDocument(() => this.bumpActivity()), vscode.workspace.onDidCloseTextDocument(() => this.bumpActivity()));
    }
    restartInterval() {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
        }
        const intervalMillis = Math.max(this.config.activitySamplingIntervalSeconds, 15) * 1000;
        this.intervalHandle = setInterval(() => this.recordCodingInterval(), intervalMillis);
    }
    bumpActivity() {
        this.lastActivity = Date.now();
    }
    isIdle() {
        const idleThresholdMs = Math.max(this.config.idleTimeoutMinutes, 1) * 60 * 1000;
        return Date.now() - this.lastActivity > idleThresholdMs;
    }
    trackActiveEditor(editor) {
        if (!editor) {
            this.context = {};
            return;
        }
        const document = editor.document;
        if (document.isUntitled) {
            this.context = {};
            return;
        }
        const projectName = this.resolveProjectName(document.uri);
        const relativePath = vscode.workspace.asRelativePath(document.uri, false);
        this.context = {
            projectName,
            filePath: relativePath,
        };
        this.bumpActivity();
    }
    resolveProjectName(resource) {
        return (0, projectNames_1.deriveProjectNameFromUri)(resource, this.config);
    }
    recordCodingInterval() {
        if (this.isIdle()) {
            return;
        }
        const projectName = this.context.projectName;
        if (!projectName) {
            return;
        }
        const seconds = Math.max(this.config.activitySamplingIntervalSeconds, 15);
        const end = new Date();
        const start = new Date(end.getTime() - seconds * 1000);
        this.database.insertSession({
            project: projectName,
            startIso: start.toISOString(),
            endIso: end.toISOString(),
            type: "coding",
            file: this.context.filePath ?? null,
        });
    }
    recordFileSave(document) {
        const projectName = this.resolveProjectName(document.uri);
        if (!projectName) {
            return;
        }
        const relativePath = vscode.workspace.asRelativePath(document.uri, false);
        const now = new Date();
        const start = new Date(now.getTime() - 10 * 1000);
        this.database.insertSession({
            project: projectName,
            startIso: start.toISOString(),
            endIso: now.toISOString(),
            type: "coding",
            file: relativePath,
        });
    }
}
exports.SessionTracker = SessionTracker;
//# sourceMappingURL=sessionTracker.js.map