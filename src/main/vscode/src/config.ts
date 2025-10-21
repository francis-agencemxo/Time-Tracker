import * as vscode from "vscode";

export interface TrackerConfiguration {
  autoStartServer: boolean;
  trackerServerPort: number;
  dashboardUrl: string;
  idleTimeoutMinutes: number;
  activitySamplingIntervalSeconds: number;
  projectNameStrategy: "workspaceFolder" | "gitOrigin" | "custom";
  customProjectName?: string;
  storageType: string;
}

const CONFIG_NAMESPACE = "codepulseTimeTracker";

export function readConfiguration(): TrackerConfiguration {
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  return {
    autoStartServer: config.get<boolean>("autoStartServer", true),
    trackerServerPort: config.get<number>("trackerServerPort", 56000),
    dashboardUrl:
      config.get<string>("dashboardUrl", "http://localhost:56000") ??
      "http://localhost:56000",
    idleTimeoutMinutes: config.get<number>("idleTimeoutMinutes", 2),
    activitySamplingIntervalSeconds: config.get<number>(
      "activitySamplingIntervalSeconds",
      60,
    ),
    projectNameStrategy: config.get(
      "projectNameStrategy",
      "workspaceFolder",
    ) as TrackerConfiguration["projectNameStrategy"],
    customProjectName: config.get<string>("customProjectName", ""),
    storageType: config.get<string>("storageType", "local") ?? "local",
  };
}

export function onConfigurationChange(
  handler: (config: TrackerConfiguration) => void,
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
      handler(readConfiguration());
    }
  });
}
