import * as fs from "fs";
import * as os from "os";
import * as path from "path";
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

type CounterKey =
  | "sessions"
  | "urls"
  | "ignoredProjects"
  | "projectNames"
  | "projectClients"
  | "commits"
  | "wrikeMappings"
  | "meetingPatterns";

interface RawCommitRecord extends CommitRecord {}

interface RawProjectClient extends ProjectClient {}

interface RawMeetingPattern extends MeetingPattern {}

interface RawDatabase {
  version: number;
  counters: Record<CounterKey, number>;
  sessions: SessionRecord[];
  urls: UrlMapping[];
  ignoredProjects: IgnoredProject[];
  projectNames: ProjectAlias[];
  projectClients: RawProjectClient[];
  commits: RawCommitRecord[];
  wrikeMappings: (WrikeMapping & { updatedAt: string })[];
  meetingPatterns: RawMeetingPattern[];
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

const DEFAULT_DB_PATH = path.join(
  os.homedir(),
  ".cache",
  "phpstorm-time-tracker",
  "data.json",
);

export class JsonDatabaseManager {
  private readonly filePath: string;
  private data: RawDatabase;

  constructor(dbPath?: string) {
    this.filePath = this.resolvePath(dbPath);
    ensureDir(this.filePath);
    this.data = this.readFile();
  }

  insertSession(params: {
    project: string;
    startIso: string;
    endIso: string;
    type: string;
    file?: string | null;
    host?: string | null;
    url?: string | null;
  }): void {
    const id = this.nextId("sessions");
    const record: SessionRecord = {
      id,
      project: params.project,
      date: params.startIso.split("T")[0],
      start: params.startIso,
      end: params.endIso,
      type: params.type,
      file: params.file ?? null,
      host: params.host ?? null,
      url: params.url ?? null,
    };
    this.data.sessions.push(record);
    this.persist();
  }

  getAllSessions(): SessionRecord[] {
    return this.sortByDateDesc(this.data.sessions, (session) => session.start);
  }

  getSessionsForProject(project: string): SessionRecord[] {
    return this.sortByDateDesc(
      this.data.sessions.filter((session) => session.project === project),
      (session) => session.start,
    );
  }

  getSessionsByDateRange(from: string, to: string): SessionRecord[] {
    return this.sortByDateDesc(
      this.data.sessions.filter(
        (session) => session.start >= from && session.start <= to,
      ),
      (session) => session.start,
    );
  }

  queryAllUrls(): UrlMapping[] {
    return this.data.urls
      .slice()
      .sort((a, b) => b.project.localeCompare(a.project));
  }

  queryProjectByUrl(host: string): string | null {
    let bestMatch: { project: string; length: number } | null = null;
    for (const mapping of this.data.urls) {
      if (!mapping.url) {
        continue;
      }
      if (host.includes(mapping.url)) {
        const candidateLength = mapping.url.length;
        if (!bestMatch || candidateLength > bestMatch.length) {
          bestMatch = { project: mapping.project, length: candidateLength };
        }
      }
    }
    return bestMatch?.project ?? null;
  }

  insertUrl(project: string, url?: string | null): void {
    const id = this.nextId("urls");
    const record: UrlMapping = {
      id,
      project,
      url: url ?? null,
    };
    this.data.urls.push(record);
    this.persist();
  }

  updateUrl(id: number, project: string, url: string): void {
    const mapping = this.data.urls.find((entry) => entry.id === id);
    if (!mapping) {
      return;
    }
    mapping.project = project;
    mapping.url = url;
    this.persist();
  }

  deleteUrlById(id: number): void {
    this.data.urls = this.data.urls.filter((entry) => entry.id !== id);
    this.persist();
  }

  removeUrls(project: string): void {
    this.data.urls = this.data.urls.filter((entry) => entry.project !== project);
    this.persist();
  }

  getAllIgnoredProjects(): IgnoredProject[] {
    return this.data.ignoredProjects
      .slice()
      .sort((a, b) => b.ignoredAt.localeCompare(a.ignoredAt));
  }

  insertIgnoredProject(projectName: string): void {
    const now = nowIso();
    const existing = this.data.ignoredProjects.find(
      (entry) => entry.projectName === projectName,
    );
    if (existing) {
      existing.ignoredAt = now;
    } else {
      const id = this.nextId("ignoredProjects");
      this.data.ignoredProjects.push({
        id,
        projectName,
        ignoredAt: now,
      });
    }
    this.persist();
  }

  deleteIgnoredProject(id: number): void {
    this.data.ignoredProjects = this.data.ignoredProjects.filter(
      (entry) => entry.id !== id,
    );
    this.persist();
  }

  getAllProjectNames(): ProjectAlias[] {
    return this.data.projectNames
      .slice()
      .sort((a, b) => a.projectName.localeCompare(b.projectName));
  }

  insertProjectName(projectName: string, customName: string): void {
    const existing = this.data.projectNames.find(
      (entry) => entry.projectName === projectName,
    );
    if (existing) {
      existing.customName = customName;
    } else {
      const id = this.nextId("projectNames");
      this.data.projectNames.push({
        id,
        projectName,
        customName,
      });
    }
    this.persist();
  }

  updateProjectName(id: number, customName: string): void {
    const alias = this.data.projectNames.find((entry) => entry.id === id);
    if (!alias) {
      return;
    }
    alias.customName = customName;
    this.persist();
  }

  deleteProjectName(id: number): void {
    this.data.projectNames = this.data.projectNames.filter(
      (entry) => entry.id !== id,
    );
    this.persist();
  }

  getAllProjectClients(): ProjectClient[] {
    return this.data.projectClients
      .slice()
      .sort((a, b) => {
        const clientCompare = a.clientName.localeCompare(b.clientName);
        if (clientCompare !== 0) {
          return clientCompare;
        }
        return a.projectName.localeCompare(b.projectName);
      });
  }

  insertProjectClient(projectName: string, clientName: string): void {
    const now = nowIso();
    const existing = this.data.projectClients.find(
      (entry) => entry.projectName === projectName,
    );
    if (existing) {
      existing.clientName = clientName;
      existing.updatedAt = now;
    } else {
      const id = this.nextId("projectClients");
      this.data.projectClients.push({
        id,
        projectName,
        clientName,
        updatedAt: now,
      });
    }
    this.persist();
  }

  updateProjectClient(id: number, clientName: string): void {
    const entry = this.data.projectClients.find((client) => client.id === id);
    if (!entry) {
      return;
    }
    entry.clientName = clientName;
    entry.updatedAt = nowIso();
    this.persist();
  }

  deleteProjectClient(id: number): void {
    this.data.projectClients = this.data.projectClients.filter(
      (client) => client.id !== id,
    );
    this.persist();
  }

  getAllCommits(): CommitRecord[] {
    return this.sortByDateDesc(
      this.data.commits,
      (commit) => commit.commitTime,
    );
  }

  getCommitsByDateRange(from: string, to: string): CommitRecord[] {
    return this.sortByDateDesc(
      this.data.commits.filter(
        (commit) => commit.commitTime >= from && commit.commitTime <= to,
      ),
      (commit) => commit.commitTime,
    );
  }

  insertCommit(params: {
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
  }): void {
    const id = this.nextId("commits");
    const record: CommitRecord = {
      id,
      project: params.project,
      commitHash: params.commitHash,
      commitMessage: params.commitMessage,
      branch: params.branch ?? "",
      authorName: params.authorName ?? "",
      authorEmail: params.authorEmail ?? "",
      commitTime: params.commitTime,
      filesChanged: params.filesChanged,
      linesAdded: params.linesAdded,
      linesDeleted: params.linesDeleted,
      createdAt: nowIso(),
    };
    this.data.commits.push(record);
    this.persist();
  }

  getAllActiveProjects(): ActiveProject[] {
    const lastActivity = new Map<string, string>();
    for (const session of this.data.sessions) {
      const current = lastActivity.get(session.project);
      if (!current || session.end > current) {
        lastActivity.set(session.project, session.end);
      }
    }
    return Array.from(lastActivity.entries())
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([name]) => ({ name }));
  }

  getAllWrikeMappings(): WrikeMapping[] {
    return this.data.wrikeMappings
      .slice()
      .sort((a, b) => a.projectName.localeCompare(b.projectName))
      .map((mapping) => ({
        id: mapping.id,
        projectName: mapping.projectName,
        wrikeProjectId: mapping.wrikeProjectId,
        wrikeProjectTitle: mapping.wrikeProjectTitle,
        wrikePermalink: mapping.wrikePermalink,
        createdAt: mapping.createdAt,
      }));
  }

  getWrikeMappingByProject(projectName: string): WrikeMapping | null {
    const mapping = this.data.wrikeMappings.find(
      (entry) => entry.projectName === projectName,
    );
    if (!mapping) {
      return null;
    }
    return {
      id: mapping.id,
      projectName: mapping.projectName,
      wrikeProjectId: mapping.wrikeProjectId,
      wrikeProjectTitle: mapping.wrikeProjectTitle,
      wrikePermalink: mapping.wrikePermalink,
      createdAt: mapping.createdAt,
    };
  }

  insertOrUpdateWrikeMapping(params: {
    projectName: string;
    wrikeProjectId: string;
    wrikeTitle: string;
    wrikePermalink: string;
  }): void {
    const now = nowIso();
    const existing = this.data.wrikeMappings.find(
      (entry) => entry.projectName === params.projectName,
    );
    if (existing) {
      existing.wrikeProjectId = params.wrikeProjectId;
      existing.wrikeProjectTitle = params.wrikeTitle;
      existing.wrikePermalink = params.wrikePermalink;
      existing.updatedAt = now;
    } else {
      const id = this.nextId("wrikeMappings");
      this.data.wrikeMappings.push({
        id,
        projectName: params.projectName,
        wrikeProjectId: params.wrikeProjectId,
        wrikeProjectTitle: params.wrikeTitle,
        wrikePermalink: params.wrikePermalink,
        createdAt: now,
        updatedAt: now,
      });
    }
    this.persist();
  }

  deleteWrikeMapping(id: number): void {
    this.data.wrikeMappings = this.data.wrikeMappings.filter(
      (entry) => entry.id !== id,
    );
    this.persist();
  }

  deleteWrikeMappingByProject(projectName: string): void {
    this.data.wrikeMappings = this.data.wrikeMappings.filter(
      (entry) => entry.projectName !== projectName,
    );
    this.persist();
  }

  insertOrUpdateMeetingPattern(params: {
    projectName: string;
    urlPattern: string;
    meetingTitle?: string | null;
    description?: string | null;
    autoAssign?: boolean;
  }): void {
    const now = nowIso();
    const existing = this.data.meetingPatterns.find(
      (entry) => entry.urlPattern === params.urlPattern,
    );
    if (existing) {
      existing.projectName = params.projectName;
      existing.meetingTitle = params.meetingTitle ?? null;
      existing.description = params.description ?? null;
      existing.autoAssign = params.autoAssign === false ? false : true;
      existing.updatedAt = now;
    } else {
      const id = this.nextId("meetingPatterns");
      this.data.meetingPatterns.push({
        id,
        projectName: params.projectName,
        urlPattern: params.urlPattern,
        meetingTitle: params.meetingTitle ?? null,
        description: params.description ?? null,
        autoAssign: params.autoAssign === false ? false : true,
        lastUsed: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    this.persist();
  }

  getAllMeetingPatterns(): MeetingPattern[] {
    return this.data.meetingPatterns
      .slice()
      .sort((a, b) => {
        const left = (a.lastUsed ?? a.createdAt) ?? "";
        const right = (b.lastUsed ?? b.createdAt) ?? "";
        return right.localeCompare(left);
      })
      .map((pattern) => ({
        id: pattern.id,
        projectName: pattern.projectName,
        urlPattern: pattern.urlPattern,
        meetingTitle: pattern.meetingTitle ?? null,
        description: pattern.description ?? null,
        autoAssign: pattern.autoAssign,
        lastUsed: pattern.lastUsed ?? null,
        createdAt: pattern.createdAt,
        updatedAt: pattern.updatedAt,
      }));
  }

  deleteMeetingPattern(id: number): void {
    this.data.meetingPatterns = this.data.meetingPatterns.filter(
      (entry) => entry.id !== id,
    );
    this.persist();
  }

  updateMeetingPatternAutoAssign(id: number, autoAssign: boolean): void {
    const entry = this.data.meetingPatterns.find((pattern) => pattern.id === id);
    if (!entry) {
      return;
    }
    entry.autoAssign = autoAssign;
    entry.updatedAt = nowIso();
    this.persist();
  }

  findMeetingPattern(url: string): string | null {
    let best: RawMeetingPattern | null = null;
    for (const pattern of this.data.meetingPatterns) {
      if (!pattern.autoAssign || !pattern.urlPattern) {
        continue;
      }
      if (url.includes(pattern.urlPattern)) {
        if (!best || pattern.urlPattern.length > (best.urlPattern?.length ?? 0)) {
          best = pattern;
        }
      }
    }
    if (!best) {
      return null;
    }
    best.lastUsed = nowIso();
    best.updatedAt = best.lastUsed;
    this.persist();
    return best.projectName;
  }

  private resolvePath(dbPath?: string): string {
    if (!dbPath) {
      return DEFAULT_DB_PATH;
    }
    if (dbPath.endsWith(".json")) {
      return dbPath;
    }
    return `${dbPath}.json`;
  }

  private readFile(): RawDatabase {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        const parsed = JSON.parse(raw) as Partial<RawDatabase>;
        return this.normalize(parsed);
      }
    } catch (error) {
      console.warn(
        `CodePulse: failed to read JSON database at ${this.filePath}, reinitialising`,
        error,
      );
    }
    return this.createEmpty();
  }

  private normalize(input: Partial<RawDatabase>): RawDatabase {
    const empty = this.createEmpty();
    return {
      version: typeof input.version === "number" ? input.version : empty.version,
      counters: {
        sessions: input.counters?.sessions ?? empty.counters.sessions,
        urls: input.counters?.urls ?? empty.counters.urls,
        ignoredProjects:
          input.counters?.ignoredProjects ?? empty.counters.ignoredProjects,
        projectNames:
          input.counters?.projectNames ?? empty.counters.projectNames,
        projectClients:
          input.counters?.projectClients ?? empty.counters.projectClients,
        commits: input.counters?.commits ?? empty.counters.commits,
        wrikeMappings:
          input.counters?.wrikeMappings ?? empty.counters.wrikeMappings,
        meetingPatterns:
          input.counters?.meetingPatterns ?? empty.counters.meetingPatterns,
      },
      sessions: Array.isArray(input.sessions) ? input.sessions : empty.sessions,
      urls: Array.isArray(input.urls) ? input.urls : empty.urls,
      ignoredProjects: Array.isArray(input.ignoredProjects)
        ? input.ignoredProjects
        : empty.ignoredProjects,
      projectNames: Array.isArray(input.projectNames)
        ? input.projectNames
        : empty.projectNames,
      projectClients: Array.isArray(input.projectClients)
        ? input.projectClients
        : empty.projectClients,
      commits: Array.isArray(input.commits) ? input.commits : empty.commits,
      wrikeMappings: Array.isArray(input.wrikeMappings)
        ? (input.wrikeMappings as RawDatabase["wrikeMappings"])
        : empty.wrikeMappings,
      meetingPatterns: Array.isArray(input.meetingPatterns)
        ? (input.meetingPatterns as RawMeetingPattern[])
        : empty.meetingPatterns,
    };
  }

  private createEmpty(): RawDatabase {
    return {
      version: 1,
      counters: {
        sessions: 0,
        urls: 0,
        ignoredProjects: 0,
        projectNames: 0,
        projectClients: 0,
        commits: 0,
        wrikeMappings: 0,
        meetingPatterns: 0,
      },
      sessions: [],
      urls: [],
      ignoredProjects: [],
      projectNames: [],
      projectClients: [],
      commits: [],
      wrikeMappings: [],
      meetingPatterns: [],
    };
  }

  private nextId(counter: CounterKey): number {
    this.data.counters[counter] = (this.data.counters[counter] ?? 0) + 1;
    return this.data.counters[counter];
  }

  private persist(): void {
    try {
      fs.writeFileSync(
        this.filePath,
        JSON.stringify(this.data, null, 2),
        "utf8",
      );
    } catch (error) {
      console.error(
        `CodePulse: failed to persist JSON database at ${this.filePath}`,
        error,
      );
    }
  }

  private sortByDateDesc<T>(
    items: T[],
    getter: (item: T) => string,
  ): T[] {
    return items
      .slice()
      .sort((a, b) => getter(b).localeCompare(getter(a)));
  }
}
