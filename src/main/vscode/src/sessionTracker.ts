import * as vscode from "vscode";
import { DatabaseManager } from "./database";
import { TrackerConfiguration } from "./config";
import { deriveProjectNameFromUri } from "./projectNames";

interface ActivityContext {
  filePath?: string | null;
  projectName?: string | null;
}

export class SessionTracker implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private intervalHandle: NodeJS.Timeout | null = null;
  private lastActivity = Date.now();
  private context: ActivityContext = {};
  private config: TrackerConfiguration;

  constructor(
    private readonly database: DatabaseManager,
    config: TrackerConfiguration,
  ) {
    this.config = config;
  }

  activate(): void {
    this.trackActiveEditor(vscode.window.activeTextEditor);
    this.registerListeners();
    this.restartInterval();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  updateConfiguration(config: TrackerConfiguration): void {
    this.config = config;
    this.restartInterval();
  }

  private registerListeners(): void {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.trackActiveEditor(editor);
      }),
      vscode.window.onDidChangeWindowState((state) => {
        if (state.focused) {
          this.bumpActivity();
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
          this.bumpActivity();
        }
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        this.bumpActivity();
        this.recordFileSave(document);
      }),
      vscode.workspace.onDidOpenTextDocument(() => this.bumpActivity()),
      vscode.workspace.onDidCloseTextDocument(() => this.bumpActivity()),
    );
  }

  private restartInterval(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
    const intervalMillis =
      Math.max(this.config.activitySamplingIntervalSeconds, 15) * 1000;
    this.intervalHandle = setInterval(() => this.recordCodingInterval(), intervalMillis);
  }

  private bumpActivity(): void {
    this.lastActivity = Date.now();
  }

  private isIdle(): boolean {
    const idleThresholdMs = Math.max(this.config.idleTimeoutMinutes, 1) * 60 * 1000;
    return Date.now() - this.lastActivity > idleThresholdMs;
  }

  private trackActiveEditor(editor: vscode.TextEditor | undefined): void {
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

  private resolveProjectName(resource: vscode.Uri): string | null {
    return deriveProjectNameFromUri(resource, this.config);
  }

  private recordCodingInterval(): void {
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

  private recordFileSave(document: vscode.TextDocument): void {
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
