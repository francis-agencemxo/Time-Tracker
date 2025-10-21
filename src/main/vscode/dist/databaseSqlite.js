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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteDatabaseManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
class SqliteDatabaseManager {
    constructor(dbPath = path.join(os.homedir(), ".cache", "phpstorm-time-tracker", "data.db")) {
        this.dbPath = dbPath;
        ensureDir(this.dbPath);
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.initialize();
        console.log(`CodePulse: using SQLite datastore at ${this.dbPath}`);
    }
    initialize() {
        this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL,
        date TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        type TEXT NOT NULL,
        file TEXT,
        host TEXT,
        url TEXT
      );

      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL,
        url TEXT
      );

      CREATE TABLE IF NOT EXISTS ignored_projects (
        id INTEGER PRIMARY KEY,
        project_name TEXT NOT NULL UNIQUE,
        ignored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ignored_projects_project_name ON ignored_projects(project_name);
      CREATE INDEX IF NOT EXISTS idx_ignored_projects_ignored_at ON ignored_projects(ignored_at);

      CREATE TABLE IF NOT EXISTS project_names (
        id INTEGER PRIMARY KEY,
        project_name TEXT NOT NULL UNIQUE,
        custom_name TEXT,
        logo_url TEXT
      );

      CREATE TABLE IF NOT EXISTS wrike_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL UNIQUE,
        wrike_project_id TEXT NOT NULL,
        wrike_title TEXT NOT NULL,
        wrike_permalink TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_wrike_mappings_project ON wrike_mappings(project_name);

      CREATE TABLE IF NOT EXISTS project_clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL UNIQUE,
        client_name TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_project_clients_project ON project_clients(project_name);
      CREATE INDEX IF NOT EXISTS idx_project_clients_client ON project_clients(client_name);

      CREATE TABLE IF NOT EXISTS commits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL,
        commit_hash TEXT NOT NULL,
        commit_message TEXT NOT NULL,
        branch TEXT,
        author_name TEXT,
        author_email TEXT,
        commit_time TEXT NOT NULL,
        files_changed INTEGER DEFAULT 0,
        lines_added INTEGER DEFAULT 0,
        lines_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project);
      CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits(commit_hash);
      CREATE INDEX IF NOT EXISTS idx_commits_time ON commits(commit_time);

      CREATE TABLE IF NOT EXISTS meeting_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL,
        url_pattern TEXT NOT NULL UNIQUE,
        meeting_title TEXT,
        description TEXT,
        auto_assign INTEGER DEFAULT 1,
        last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_meeting_patterns_project ON meeting_patterns(project_name);
      CREATE INDEX IF NOT EXISTS idx_meeting_patterns_url ON meeting_patterns(url_pattern);
    `);
    }
    insertSession(params) {
        const { project, startIso, endIso, type, file, host, url } = params;
        const date = startIso.split("T")[0];
        const stmt = this.db.prepare(`
      INSERT INTO sessions (project, date, start, end, type, file, host, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(project, date, startIso, endIso, type, file ?? null, host ?? null, url ?? null);
    }
    getAllSessions() {
        const stmt = this.db.prepare(`
      SELECT id, project, date, start, end, type, file, host, url
        FROM sessions
        ORDER BY start DESC
    `);
        return stmt.all();
    }
    getSessionsForProject(project) {
        const stmt = this.db.prepare(`
      SELECT id, project, date, start, end, type, file, host, url
        FROM sessions
        WHERE project = ?
        ORDER BY start DESC
    `);
        return stmt.all(project);
    }
    getSessionsByDateRange(from, to) {
        const stmt = this.db.prepare(`
      SELECT id, project, date, start, end, type, file, host, url
        FROM sessions
        WHERE start BETWEEN ? AND ?
        ORDER BY start DESC
    `);
        return stmt.all(from, to);
    }
    queryAllUrls() {
        const stmt = this.db.prepare(`
      SELECT id, project, url
        FROM urls
        ORDER BY project DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            project: row.project,
            url: row.url,
        }));
    }
    queryProjectByUrl(host) {
        const stmt = this.db.prepare(`
      SELECT project
        FROM urls
       WHERE ? LIKE '%' || url || '%'
    ORDER BY length(url) DESC
       LIMIT 1
    `);
        const row = stmt.get(host);
        return row?.project ?? null;
    }
    insertUrl(project, url) {
        const stmt = this.db.prepare(`
      INSERT INTO urls (project, url)
      VALUES (?, ?)
    `);
        stmt.run(project, url ?? null);
    }
    updateUrl(id, project, url) {
        const stmt = this.db.prepare(`
      UPDATE urls
         SET project = ?, url = ?
       WHERE id = ?
    `);
        stmt.run(project, url, id);
    }
    deleteUrlById(id) {
        const stmt = this.db.prepare(`
      DELETE FROM urls
       WHERE id = ?
    `);
        stmt.run(id);
    }
    removeUrls(project) {
        const stmt = this.db.prepare(`
      DELETE FROM urls
       WHERE project = ?
    `);
        stmt.run(project);
    }
    getAllIgnoredProjects() {
        const stmt = this.db.prepare(`
      SELECT id, project_name, ignored_at
        FROM ignored_projects
        ORDER BY ignored_at DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            projectName: row.project_name,
            ignoredAt: row.ignored_at,
        }));
    }
    insertIgnoredProject(projectName) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ignored_projects (project_name, ignored_at, updated_at)
      VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
        stmt.run(projectName);
    }
    deleteIgnoredProject(id) {
        const stmt = this.db.prepare(`
      DELETE FROM ignored_projects
       WHERE id = ?
    `);
        stmt.run(id);
    }
    getAllProjectNames() {
        const stmt = this.db.prepare(`
      SELECT id, project_name, custom_name
        FROM project_names
        ORDER BY project_name
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            projectName: row.project_name,
            customName: row.custom_name,
        }));
    }
    insertProjectName(projectName, customName) {
        const stmt = this.db.prepare(`
      INSERT INTO project_names (project_name, custom_name)
      VALUES (?, ?)
      ON CONFLICT(project_name) DO UPDATE SET
        custom_name = excluded.custom_name
    `);
        stmt.run(projectName, customName);
    }
    updateProjectName(id, customName) {
        const stmt = this.db.prepare(`
      UPDATE project_names
         SET custom_name = ?
       WHERE id = ?
    `);
        stmt.run(customName, id);
    }
    deleteProjectName(id) {
        const stmt = this.db.prepare(`
      DELETE FROM project_names
       WHERE id = ?
    `);
        stmt.run(id);
    }
    getAllProjectClients() {
        const stmt = this.db.prepare(`
      SELECT id, project_name, client_name, updated_at
        FROM project_clients
        ORDER BY client_name, project_name
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            projectName: row.project_name,
            clientName: row.client_name,
            updatedAt: row.updated_at,
        }));
    }
    insertProjectClient(projectName, clientName) {
        const stmt = this.db.prepare(`
      INSERT INTO project_clients (project_name, client_name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(project_name) DO UPDATE SET
        client_name = excluded.client_name,
        updated_at = CURRENT_TIMESTAMP
    `);
        stmt.run(projectName, clientName);
    }
    updateProjectClient(id, clientName) {
        const stmt = this.db.prepare(`
      UPDATE project_clients
         SET client_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `);
        stmt.run(clientName, id);
    }
    deleteProjectClient(id) {
        const stmt = this.db.prepare(`
      DELETE FROM project_clients
       WHERE id = ?
    `);
        stmt.run(id);
    }
    getAllCommits() {
        const stmt = this.db.prepare(`
      SELECT id, project, commit_hash, commit_message, branch,
             author_name, author_email, commit_time, files_changed,
             lines_added, lines_deleted, created_at
        FROM commits
        ORDER BY commit_time DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            project: row.project,
            commitHash: row.commit_hash,
            commitMessage: row.commit_message,
            branch: row.branch ?? "",
            authorName: row.author_name ?? "",
            authorEmail: row.author_email ?? "",
            commitTime: row.commit_time,
            filesChanged: row.files_changed,
            linesAdded: row.lines_added,
            linesDeleted: row.lines_deleted,
            createdAt: row.created_at,
        }));
    }
    getCommitsByDateRange(from, to) {
        const stmt = this.db.prepare(`
      SELECT id, project, commit_hash, commit_message, branch,
             author_name, author_email, commit_time, files_changed,
             lines_added, lines_deleted, created_at
        FROM commits
       WHERE commit_time BETWEEN ? AND ?
       ORDER BY commit_time DESC
    `);
        const rows = stmt.all(from, to);
        return rows.map((row) => ({
            id: row.id,
            project: row.project,
            commitHash: row.commit_hash,
            commitMessage: row.commit_message,
            branch: row.branch ?? "",
            authorName: row.author_name ?? "",
            authorEmail: row.author_email ?? "",
            commitTime: row.commit_time,
            filesChanged: row.files_changed,
            linesAdded: row.lines_added,
            linesDeleted: row.lines_deleted,
            createdAt: row.created_at,
        }));
    }
    insertCommit(params) {
        const stmt = this.db.prepare(`
      INSERT INTO commits (
        project, commit_hash, commit_message, branch,
        author_name, author_email, commit_time,
        files_changed, lines_added, lines_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(params.project, params.commitHash, params.commitMessage, params.branch ?? null, params.authorName ?? null, params.authorEmail ?? null, params.commitTime, params.filesChanged, params.linesAdded, params.linesDeleted);
    }
    getAllActiveProjects() {
        const stmt = this.db.prepare(`
      SELECT project AS name, MAX(end) AS last_worked_on
        FROM sessions
        GROUP BY project
        ORDER BY last_worked_on DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            name: row.name,
        }));
    }
    getAllWrikeMappings() {
        const stmt = this.db.prepare(`
      SELECT id, project_name, wrike_project_id, wrike_title, wrike_permalink, created_at
        FROM wrike_mappings
        ORDER BY project_name
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            projectName: row.project_name,
            wrikeProjectId: row.wrike_project_id,
            wrikeProjectTitle: row.wrike_title,
            wrikePermalink: row.wrike_permalink,
            createdAt: row.created_at,
        }));
    }
    getWrikeMappingByProject(projectName) {
        const stmt = this.db.prepare(`
      SELECT id, project_name, wrike_project_id, wrike_title, wrike_permalink, created_at
        FROM wrike_mappings
       WHERE project_name = ?
    `);
        const row = stmt.get(projectName);
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            projectName: row.project_name,
            wrikeProjectId: row.wrike_project_id,
            wrikeProjectTitle: row.wrike_title,
            wrikePermalink: row.wrike_permalink,
            createdAt: row.created_at,
        };
    }
    insertOrUpdateWrikeMapping(params) {
        const stmt = this.db.prepare(`
      INSERT INTO wrike_mappings (project_name, wrike_project_id, wrike_title, wrike_permalink)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_name) DO UPDATE SET
        wrike_project_id = excluded.wrike_project_id,
        wrike_title = excluded.wrike_title,
        wrike_permalink = excluded.wrike_permalink,
        updated_at = CURRENT_TIMESTAMP
    `);
        stmt.run(params.projectName, params.wrikeProjectId, params.wrikeTitle, params.wrikePermalink);
    }
    deleteWrikeMapping(id) {
        const stmt = this.db.prepare(`
      DELETE FROM wrike_mappings
       WHERE id = ?
    `);
        stmt.run(id);
    }
    deleteWrikeMappingByProject(projectName) {
        const stmt = this.db.prepare(`
      DELETE FROM wrike_mappings
       WHERE project_name = ?
    `);
        stmt.run(projectName);
    }
    insertOrUpdateMeetingPattern(params) {
        const stmt = this.db.prepare(`
      INSERT INTO meeting_patterns (project_name, url_pattern, meeting_title, description, auto_assign, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(url_pattern) DO UPDATE SET
        project_name = excluded.project_name,
        meeting_title = excluded.meeting_title,
        description = excluded.description,
        auto_assign = excluded.auto_assign,
        updated_at = CURRENT_TIMESTAMP
    `);
        stmt.run(params.projectName, params.urlPattern, params.meetingTitle ?? null, params.description ?? null, params.autoAssign === false ? 0 : 1);
    }
    getAllMeetingPatterns() {
        const stmt = this.db.prepare(`
      SELECT id, project_name, url_pattern, meeting_title, description,
             auto_assign, last_used, created_at, updated_at
        FROM meeting_patterns
        ORDER BY last_used DESC, created_at DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            id: row.id,
            projectName: row.project_name,
            urlPattern: row.url_pattern,
            meetingTitle: row.meeting_title,
            description: row.description,
            autoAssign: row.auto_assign === 1,
            lastUsed: row.last_used,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }
    deleteMeetingPattern(id) {
        const stmt = this.db.prepare(`
      DELETE FROM meeting_patterns
       WHERE id = ?
    `);
        stmt.run(id);
    }
    updateMeetingPatternAutoAssign(id, autoAssign) {
        const stmt = this.db.prepare(`
      UPDATE meeting_patterns
         SET auto_assign = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `);
        stmt.run(autoAssign ? 1 : 0, id);
    }
    findMeetingPattern(url) {
        const stmt = this.db.prepare(`
      SELECT project_name
        FROM meeting_patterns
        WHERE auto_assign = 1 AND ? LIKE '%' || url_pattern || '%'
        ORDER BY length(url_pattern) DESC
        LIMIT 1
    `);
        const row = stmt.get(url);
        if (!row?.project_name) {
            return null;
        }
        this.updateMeetingPatternLastUsed(url);
        return row.project_name;
    }
    updateMeetingPatternLastUsed(url) {
        const stmt = this.db.prepare(`
      UPDATE meeting_patterns
         SET last_used = CURRENT_TIMESTAMP
       WHERE ? LIKE '%' || url_pattern || '%'
    `);
        stmt.run(url);
    }
}
exports.SqliteDatabaseManager = SqliteDatabaseManager;
//# sourceMappingURL=databaseSqlite.js.map