import {
  ActiveProject,
  CommitRecord,
  IgnoredProject,
  MeetingPattern,
  ProjectAlias,
  ProjectClient,
  SessionRecord,
  UrlMapping,
  WrikeMapping,
} from "./databaseTypes";
import { JsonDatabaseManager } from "./databaseJson";

export {
  ActiveProject,
  CommitRecord,
  IgnoredProject,
  MeetingPattern,
  ProjectAlias,
  ProjectClient,
  SessionRecord,
  UrlMapping,
  WrikeMapping,
} from "./databaseTypes";

type InsertSessionParams = {
  project: string;
  startIso: string;
  endIso: string;
  type: string;
  file?: string | null;
  host?: string | null;
  url?: string | null;
};

type InsertCommitParams = {
  project: string;
  commitHash: string;
  commitMessage: string;
  branch?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  commitTime: string;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
};

type InsertOrUpdateWrikeParams = {
  projectName: string;
  wrikeProjectId: string;
  wrikeTitle: string;
  wrikePermalink: string;
};

type InsertOrUpdateMeetingPatternParams = {
  projectName: string;
  urlPattern: string;
  meetingTitle?: string | null;
  description?: string | null;
  autoAssign?: boolean;
};

interface DatabaseBackend {
  insertSession(params: InsertSessionParams): void;
  getAllSessions(): SessionRecord[];
  getSessionsForProject(project: string): SessionRecord[];
  getSessionsByDateRange(from: string, to: string): SessionRecord[];
  queryAllUrls(): UrlMapping[];
  queryProjectByUrl(host: string): string | null;
  insertUrl(project: string, url?: string | null): void;
  updateUrl(id: number, project: string, url: string): void;
  deleteUrlById(id: number): void;
  removeUrls(project: string): void;
  getAllIgnoredProjects(): IgnoredProject[];
  insertIgnoredProject(projectName: string): void;
  deleteIgnoredProject(id: number): void;
  getAllProjectNames(): ProjectAlias[];
  insertProjectName(projectName: string, customName: string): void;
  updateProjectName(id: number, customName: string): void;
  deleteProjectName(id: number): void;
  getAllProjectClients(): ProjectClient[];
  insertProjectClient(projectName: string, clientName: string): void;
  updateProjectClient(id: number, clientName: string): void;
  deleteProjectClient(id: number): void;
  getAllCommits(): CommitRecord[];
  getCommitsByDateRange(from: string, to: string): CommitRecord[];
  insertCommit(params: InsertCommitParams): void;
  getAllActiveProjects(): ActiveProject[];
  getAllWrikeMappings(): WrikeMapping[];
  getWrikeMappingByProject(projectName: string): WrikeMapping | null;
  insertOrUpdateWrikeMapping(params: InsertOrUpdateWrikeParams): void;
  deleteWrikeMapping(id: number): void;
  deleteWrikeMappingByProject(projectName: string): void;
  insertOrUpdateMeetingPattern(
    params: InsertOrUpdateMeetingPatternParams,
  ): void;
  getAllMeetingPatterns(): MeetingPattern[];
  deleteMeetingPattern(id: number): void;
  updateMeetingPatternAutoAssign(id: number, autoAssign: boolean): void;
  findMeetingPattern(url: string): string | null;
}

type SqliteConstructor = new (dbPath?: string) => DatabaseBackend;

let SqliteDatabaseCtor: SqliteConstructor | null = null;
let sqliteBootstrapError: unknown = null;
let warnedAboutFallback = false;

try {
  // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
  const moduleExports = require("./databaseSqlite") as {
    SqliteDatabaseManager: SqliteConstructor;
  };
  SqliteDatabaseCtor = moduleExports.SqliteDatabaseManager;
} catch (error) {
  sqliteBootstrapError = error;
  SqliteDatabaseCtor = null;
}

export class DatabaseManager implements DatabaseBackend {
  private readonly delegate: DatabaseBackend;
  readonly backend: "sqlite" | "json";

  constructor(dbPath?: string) {
    if (SqliteDatabaseCtor) {
      try {
        this.delegate = new SqliteDatabaseCtor(dbPath);
        this.backend = "sqlite";
        return;
      } catch (error) {
        this.logFallback(
          "Initialising SQLite backend failed, switching to JSON store.",
          error,
        );
      }
    } else if (sqliteBootstrapError) {
      this.logFallback(
        "SQLite backend is unavailable, switching to JSON store.",
        sqliteBootstrapError,
      );
    }

    this.delegate = new JsonDatabaseManager(dbPath);
    this.backend = "json";
  }

  insertSession(params: InsertSessionParams): void {
    this.delegate.insertSession(params);
  }

  getAllSessions(): SessionRecord[] {
    return this.delegate.getAllSessions();
  }

  getSessionsForProject(project: string): SessionRecord[] {
    return this.delegate.getSessionsForProject(project);
  }

  getSessionsByDateRange(from: string, to: string): SessionRecord[] {
    return this.delegate.getSessionsByDateRange(from, to);
  }

  queryAllUrls(): UrlMapping[] {
    return this.delegate.queryAllUrls();
  }

  queryProjectByUrl(host: string): string | null {
    return this.delegate.queryProjectByUrl(host);
  }

  insertUrl(project: string, url?: string | null): void {
    this.delegate.insertUrl(project, url);
  }

  updateUrl(id: number, project: string, url: string): void {
    this.delegate.updateUrl(id, project, url);
  }

  deleteUrlById(id: number): void {
    this.delegate.deleteUrlById(id);
  }

  removeUrls(project: string): void {
    this.delegate.removeUrls(project);
  }

  getAllIgnoredProjects(): IgnoredProject[] {
    return this.delegate.getAllIgnoredProjects();
  }

  insertIgnoredProject(projectName: string): void {
    this.delegate.insertIgnoredProject(projectName);
  }

  deleteIgnoredProject(id: number): void {
    this.delegate.deleteIgnoredProject(id);
  }

  getAllProjectNames(): ProjectAlias[] {
    return this.delegate.getAllProjectNames();
  }

  insertProjectName(projectName: string, customName: string): void {
    this.delegate.insertProjectName(projectName, customName);
  }

  updateProjectName(id: number, customName: string): void {
    this.delegate.updateProjectName(id, customName);
  }

  deleteProjectName(id: number): void {
    this.delegate.deleteProjectName(id);
  }

  getAllProjectClients(): ProjectClient[] {
    return this.delegate.getAllProjectClients();
  }

  insertProjectClient(projectName: string, clientName: string): void {
    this.delegate.insertProjectClient(projectName, clientName);
  }

  updateProjectClient(id: number, clientName: string): void {
    this.delegate.updateProjectClient(id, clientName);
  }

  deleteProjectClient(id: number): void {
    this.delegate.deleteProjectClient(id);
  }

  getAllCommits(): CommitRecord[] {
    return this.delegate.getAllCommits();
  }

  getCommitsByDateRange(from: string, to: string): CommitRecord[] {
    return this.delegate.getCommitsByDateRange(from, to);
  }

  insertCommit(params: InsertCommitParams): void {
    this.delegate.insertCommit(params);
  }

  getAllActiveProjects(): ActiveProject[] {
    return this.delegate.getAllActiveProjects();
  }

  getAllWrikeMappings(): WrikeMapping[] {
    return this.delegate.getAllWrikeMappings();
  }

  getWrikeMappingByProject(projectName: string): WrikeMapping | null {
    return this.delegate.getWrikeMappingByProject(projectName);
  }

  insertOrUpdateWrikeMapping(params: InsertOrUpdateWrikeParams): void {
    this.delegate.insertOrUpdateWrikeMapping(params);
  }

  deleteWrikeMapping(id: number): void {
    this.delegate.deleteWrikeMapping(id);
  }

  deleteWrikeMappingByProject(projectName: string): void {
    this.delegate.deleteWrikeMappingByProject(projectName);
  }

  insertOrUpdateMeetingPattern(
    params: InsertOrUpdateMeetingPatternParams,
  ): void {
    this.delegate.insertOrUpdateMeetingPattern(params);
  }

  getAllMeetingPatterns(): MeetingPattern[] {
    return this.delegate.getAllMeetingPatterns();
  }

  deleteMeetingPattern(id: number): void {
    this.delegate.deleteMeetingPattern(id);
  }

  updateMeetingPatternAutoAssign(id: number, autoAssign: boolean): void {
    this.delegate.updateMeetingPatternAutoAssign(id, autoAssign);
  }

  findMeetingPattern(url: string): string | null {
    return this.delegate.findMeetingPattern(url);
  }

  private logFallback(message: string, error: unknown): void {
    if (!warnedAboutFallback) {
      console.warn(`CodePulse: ${message} Run "npm run rebuild-native" inside src/main/vscode to build better-sqlite3 for VS Code. (Extension host ABI ${process.versions.modules ?? 'unknown'})`, error);
      warnedAboutFallback = true;
    }
  }
}
