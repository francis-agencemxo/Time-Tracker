"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const databaseJson_1 = require("./databaseJson");
let SqliteDatabaseCtor = null;
let sqliteBootstrapError = null;
let warnedAboutFallback = false;
try {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const moduleExports = require("./databaseSqlite");
    SqliteDatabaseCtor = moduleExports.SqliteDatabaseManager;
}
catch (error) {
    sqliteBootstrapError = error;
    SqliteDatabaseCtor = null;
}
class DatabaseManager {
    constructor(dbPath) {
        if (SqliteDatabaseCtor) {
            try {
                this.delegate = new SqliteDatabaseCtor(dbPath);
                this.backend = "sqlite";
                return;
            }
            catch (error) {
                this.logFallback("Initialising SQLite backend failed, switching to JSON store.", error);
            }
        }
        else if (sqliteBootstrapError) {
            this.logFallback("SQLite backend is unavailable, switching to JSON store.", sqliteBootstrapError);
        }
        this.delegate = new databaseJson_1.JsonDatabaseManager(dbPath);
        this.backend = "json";
    }
    insertSession(params) {
        this.delegate.insertSession(params);
    }
    getAllSessions() {
        return this.delegate.getAllSessions();
    }
    getSessionsForProject(project) {
        return this.delegate.getSessionsForProject(project);
    }
    getSessionsByDateRange(from, to) {
        return this.delegate.getSessionsByDateRange(from, to);
    }
    queryAllUrls() {
        return this.delegate.queryAllUrls();
    }
    queryProjectByUrl(host) {
        return this.delegate.queryProjectByUrl(host);
    }
    insertUrl(project, url) {
        this.delegate.insertUrl(project, url);
    }
    updateUrl(id, project, url) {
        this.delegate.updateUrl(id, project, url);
    }
    deleteUrlById(id) {
        this.delegate.deleteUrlById(id);
    }
    removeUrls(project) {
        this.delegate.removeUrls(project);
    }
    getAllIgnoredProjects() {
        return this.delegate.getAllIgnoredProjects();
    }
    insertIgnoredProject(projectName) {
        this.delegate.insertIgnoredProject(projectName);
    }
    deleteIgnoredProject(id) {
        this.delegate.deleteIgnoredProject(id);
    }
    getAllProjectNames() {
        return this.delegate.getAllProjectNames();
    }
    insertProjectName(projectName, customName) {
        this.delegate.insertProjectName(projectName, customName);
    }
    updateProjectName(id, customName) {
        this.delegate.updateProjectName(id, customName);
    }
    deleteProjectName(id) {
        this.delegate.deleteProjectName(id);
    }
    getAllProjectClients() {
        return this.delegate.getAllProjectClients();
    }
    insertProjectClient(projectName, clientName) {
        this.delegate.insertProjectClient(projectName, clientName);
    }
    updateProjectClient(id, clientName) {
        this.delegate.updateProjectClient(id, clientName);
    }
    deleteProjectClient(id) {
        this.delegate.deleteProjectClient(id);
    }
    getAllCommits() {
        return this.delegate.getAllCommits();
    }
    getCommitsByDateRange(from, to) {
        return this.delegate.getCommitsByDateRange(from, to);
    }
    insertCommit(params) {
        this.delegate.insertCommit(params);
    }
    getAllActiveProjects() {
        return this.delegate.getAllActiveProjects();
    }
    getAllWrikeMappings() {
        return this.delegate.getAllWrikeMappings();
    }
    getWrikeMappingByProject(projectName) {
        return this.delegate.getWrikeMappingByProject(projectName);
    }
    insertOrUpdateWrikeMapping(params) {
        this.delegate.insertOrUpdateWrikeMapping(params);
    }
    deleteWrikeMapping(id) {
        this.delegate.deleteWrikeMapping(id);
    }
    deleteWrikeMappingByProject(projectName) {
        this.delegate.deleteWrikeMappingByProject(projectName);
    }
    insertOrUpdateMeetingPattern(params) {
        this.delegate.insertOrUpdateMeetingPattern(params);
    }
    getAllMeetingPatterns() {
        return this.delegate.getAllMeetingPatterns();
    }
    deleteMeetingPattern(id) {
        this.delegate.deleteMeetingPattern(id);
    }
    updateMeetingPatternAutoAssign(id, autoAssign) {
        this.delegate.updateMeetingPatternAutoAssign(id, autoAssign);
    }
    findMeetingPattern(url) {
        return this.delegate.findMeetingPattern(url);
    }
    logFallback(message, error) {
        if (!warnedAboutFallback) {
            console.warn(`CodePulse: ${message} Run "npm run rebuild-native" inside src/main/vscode to build better-sqlite3 for VS Code. (Extension host ABI ${process.versions.modules ?? 'unknown'})`, error);
            warnedAboutFallback = true;
        }
    }
}
exports.DatabaseManager = DatabaseManager;
//# sourceMappingURL=database.js.map