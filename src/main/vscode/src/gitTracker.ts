import * as vscode from "vscode";
import { execSync } from "child_process";
import { DatabaseManager } from "./database";
import { TrackerConfiguration } from "./config";
import { deriveProjectNameFromPath } from "./projectNames";

interface GitExtensionExports {
  getAPI(version: number): GitAPI;
}

interface GitAPI {
  repositories: Repository[];
  onDidOpenRepository: vscode.Event<Repository>;
  onDidCloseRepository: vscode.Event<Repository>;
  onDidRunGitCommand?: vscode.Event<GitCommandEvent>;
}

interface Repository {
  rootUri: vscode.Uri;
}

interface GitCommandEvent {
  command: string;
  args?: string[];
  exitCode?: number;
  repository?: Repository;
}

export class GitCommitTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private config: TrackerConfiguration;

  constructor(
    private readonly database: DatabaseManager,
    config: TrackerConfiguration,
  ) {
    this.config = config;
  }

  activate(): void {
    const extension = vscode.extensions.getExtension<GitExtensionExports>("vscode.git");
    if (!extension) {
      console.warn("CodePulse: Git extension not available. Skipping commit tracking.");
      return;
    }

    const loadApi = (extension.isActive
      ? Promise.resolve(extension.exports)
      : extension.activate().then(() => extension.exports)) as Promise<GitExtensionExports>;

    loadApi
      .then((exports) => exports.getAPI(1))
      .then((api) => this.registerApi(api))
      .catch((error) => {
        console.warn("CodePulse: unable to initialise Git API", error);
      });
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }

  updateConfiguration(config: TrackerConfiguration): void {
    this.config = config;
  }

  private registerApi(api: GitAPI): void {
    if (api.onDidRunGitCommand) {
      this.disposables.push(
        api.onDidRunGitCommand((event) => {
          if (!event.repository || (typeof event.exitCode === "number" && event.exitCode !== 0)) {
            return;
          }
          if (event.command.startsWith("commit")) {
            this.captureCommit(event.repository);
          }
        }),
      );
    }

    for (const repo of api.repositories) {
      this.captureCommit(repo);
    }

    this.disposables.push(api.onDidOpenRepository((repo) => this.captureCommit(repo)));
  }

  private captureCommit(repo: Repository): void {
    try {
      const repoPath = repo.rootUri.fsPath;
      const projectName = deriveProjectNameFromPath(repoPath, this.config);
      if (!projectName) {
        return;
      }

      const commitHash = execSync("git rev-parse HEAD", {
        cwd: repoPath,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();

      if (!commitHash) {
        return;
      }

      const pretty = execSync(
        "git log -1 --pretty=format:%H%n%s%n%an%n%ae%n%aI",
        { cwd: repoPath, stdio: ["ignore", "pipe", "ignore"] },
      )
        .toString()
        .split("\n");

      const branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: repoPath,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();

      const statsOutput = execSync("git show --stat --oneline -1", {
        cwd: repoPath,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString();

      const stats = statsOutput.match(
        /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
      );

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
    } catch (error) {
      console.warn("CodePulse: failed to record commit", error);
    }
  }
}
