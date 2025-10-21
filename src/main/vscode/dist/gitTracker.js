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
exports.GitCommitTracker = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const projectNames_1 = require("./projectNames");
class GitCommitTracker {
    constructor(database, config) {
        this.database = database;
        this.disposables = [];
        this.config = config;
    }
    activate() {
        const extension = vscode.extensions.getExtension("vscode.git");
        if (!extension) {
            console.warn("CodePulse: Git extension not available. Skipping commit tracking.");
            return;
        }
        const loadApi = (extension.isActive
            ? Promise.resolve(extension.exports)
            : extension.activate().then(() => extension.exports));
        loadApi
            .then((exports) => exports.getAPI(1))
            .then((api) => this.registerApi(api))
            .catch((error) => {
            console.warn("CodePulse: unable to initialise Git API", error);
        });
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
    updateConfiguration(config) {
        this.config = config;
    }
    registerApi(api) {
        if (api.onDidRunGitCommand) {
            this.disposables.push(api.onDidRunGitCommand((event) => {
                if (!event.repository || (typeof event.exitCode === "number" && event.exitCode !== 0)) {
                    return;
                }
                if (event.command.startsWith("commit")) {
                    this.captureCommit(event.repository);
                }
            }));
        }
        for (const repo of api.repositories) {
            this.captureCommit(repo);
        }
        this.disposables.push(api.onDidOpenRepository((repo) => this.captureCommit(repo)));
    }
    captureCommit(repo) {
        try {
            const repoPath = repo.rootUri.fsPath;
            const projectName = (0, projectNames_1.deriveProjectNameFromPath)(repoPath, this.config);
            if (!projectName) {
                return;
            }
            const commitHash = (0, child_process_1.execSync)("git rev-parse HEAD", {
                cwd: repoPath,
                stdio: ["ignore", "pipe", "ignore"],
            })
                .toString()
                .trim();
            if (!commitHash) {
                return;
            }
            const pretty = (0, child_process_1.execSync)("git log -1 --pretty=format:%H%n%s%n%an%n%ae%n%aI", { cwd: repoPath, stdio: ["ignore", "pipe", "ignore"] })
                .toString()
                .split("\n");
            const branch = (0, child_process_1.execSync)("git rev-parse --abbrev-ref HEAD", {
                cwd: repoPath,
                stdio: ["ignore", "pipe", "ignore"],
            })
                .toString()
                .trim();
            const statsOutput = (0, child_process_1.execSync)("git show --stat --oneline -1", {
                cwd: repoPath,
                stdio: ["ignore", "pipe", "ignore"],
            })
                .toString();
            const stats = statsOutput.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
            const filesChanged = stats ? parseInt(stats[1] ?? "0", 10) : 0;
            const linesAdded = stats ? parseInt(stats[2] ?? "0", 10) : 0;
            const linesDeleted = stats ? parseInt(stats[3] ?? "0", 10) : 0;
            this.database.insertCommit({
                project: projectName,
                commitHash,
                commitMessage: pretty[1] ?? "",
                branch,
                authorName: pretty[2] ?? "",
                authorEmail: pretty[3] ?? "",
                commitTime: pretty[4] ?? new Date().toISOString(),
                filesChanged,
                linesAdded,
                linesDeleted,
            });
        }
        catch (error) {
            console.warn("CodePulse: failed to record commit", error);
        }
    }
}
exports.GitCommitTracker = GitCommitTracker;
//# sourceMappingURL=gitTracker.js.map