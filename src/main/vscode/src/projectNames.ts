import * as vscode from "vscode";
import * as path from "path";
import { execSync } from "child_process";
import { TrackerConfiguration } from "./config";

function extractRepoName(remoteUrl: string): string {
  const sanitized = remoteUrl
    .replace(/^git@/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\.git$/, "");
  const segments = sanitized.split("/");
  return segments[segments.length - 1] || sanitized;
}

export function deriveProjectNameFromUri(
  resource: vscode.Uri,
  config: TrackerConfiguration,
): string | null {
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

export function deriveProjectNameFromPath(
  fsPath: string,
  config: TrackerConfiguration,
): string | null {
  if (config.projectNameStrategy === "custom") {
    const custom = config.customProjectName?.trim();
    if (custom) {
      return custom;
    }
  }

  if (config.projectNameStrategy === "gitOrigin") {
    try {
      const output = execSync("git config --get remote.origin.url", {
        cwd: fsPath,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim();
      if (output) {
        return extractRepoName(output);
      }
    } catch {
      // ignore
    }
  }

  return path.basename(fsPath);
}
