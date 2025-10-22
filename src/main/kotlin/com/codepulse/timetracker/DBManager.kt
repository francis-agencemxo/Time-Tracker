package com.codepulse.timetracker

import java.io.File
import java.sql.Connection
import java.sql.DriverManager
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject
import org.sqlite.SQLiteDataSource

object DBManager {
    private const val DB_NAME = "data.db"
    private val dbFile = File(System.getProperty("user.home"), ".cache/phpstorm-time-tracker/$DB_NAME")
    private val conn: Connection

    data class Session(
        val id: Int,
        val project: String,
        val start: String,
        val end: String,
        val type: String,
        val file: String?,
        val host: String?,
        val url: String?
    )


    init {
        println("→→→→→→ Opening SQLite DB at ${dbFile.absolutePath}")

        dbFile.parentFile.mkdirs()

        // create and configure the datasource
        val ds = SQLiteDataSource().apply {
            url = "jdbc:sqlite:${dbFile.absolutePath}"
        }
        conn = ds.connection
        conn.createStatement().use { st ->
            st.executeUpdate("""
        CREATE TABLE IF NOT EXISTS sessions (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          project TEXT    NOT NULL,
          date    TEXT    NOT NULL,     -- ISO yyyy-MM-dd
          start   TEXT    NOT NULL,     -- ISO datetime
          end     TEXT    NOT NULL,     -- ISO datetime
          type    TEXT    NOT NULL,
          file    TEXT,
          host    TEXT,
          url     TEXT
        );
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
         CREATE TABLE IF NOT EXISTS ignored_projects (
            id INTEGER PRIMARY KEY,
            project_name TEXT NOT NULL,
            ignored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            
            -- SQLite uses different syntax for unique constraints
            UNIQUE(project_name)
        );
        
        -- Indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_ignored_projects_project_name ON ignored_projects(project_name);
        CREATE INDEX IF NOT EXISTS idx_ignored_projects_ignored_at ON ignored_projects(ignored_at);
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
         CREATE TABLE IF NOT EXISTS project_names (
            id INTEGER PRIMARY KEY,
            project_name TEXT NOT NULL,
            custom_name DATETIME DEFAULT CURRENT_TIMESTAMP,
            logo_url TEXT,
            
            -- SQLite uses different syntax for unique constraints
            UNIQUE(project_name)
        );
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
        CREATE TABLE IF NOT EXISTS urls (
          id      INTEGER PRIMARY KEY AUTOINCREMENT,
          project TEXT    NOT NULL,
          url     TEXT
        );
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
        CREATE TABLE IF NOT EXISTS wrike_mappings (
          id                INTEGER PRIMARY KEY AUTOINCREMENT,
          project_name      TEXT    NOT NULL UNIQUE,
          wrike_project_id  TEXT    NOT NULL,
          wrike_title       TEXT    NOT NULL,
          wrike_permalink   TEXT    NOT NULL,
          created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_wrike_mappings_project ON wrike_mappings(project_name);
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
        CREATE TABLE IF NOT EXISTS project_clients (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          project_name TEXT    NOT NULL UNIQUE,
          client_name  TEXT    NOT NULL,
          updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_project_clients_project ON project_clients(project_name);
        CREATE INDEX IF NOT EXISTS idx_project_clients_client ON project_clients(client_name);
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
        CREATE TABLE IF NOT EXISTS commits (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          project         TEXT    NOT NULL,
          commit_hash     TEXT    NOT NULL,
          commit_message  TEXT    NOT NULL,
          branch          TEXT,
          author_name     TEXT,
          author_email    TEXT,
          commit_time     TEXT    NOT NULL,
          files_changed   INTEGER DEFAULT 0,
          lines_added     INTEGER DEFAULT 0,
          lines_deleted   INTEGER DEFAULT 0,
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project);
        CREATE INDEX IF NOT EXISTS idx_commits_hash ON commits(commit_hash);
        CREATE INDEX IF NOT EXISTS idx_commits_time ON commits(commit_time);
      """.trimIndent())
        }

        conn.createStatement().use { st ->
            st.executeUpdate("""
        CREATE TABLE IF NOT EXISTS meeting_patterns (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          project_name    TEXT    NOT NULL,
          url_pattern     TEXT    NOT NULL,
          meeting_title   TEXT,
          description     TEXT,
          auto_assign     INTEGER DEFAULT 1,
          last_used       DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

          UNIQUE(url_pattern)
        );

        CREATE INDEX IF NOT EXISTS idx_meeting_patterns_project ON meeting_patterns(project_name);
        CREATE INDEX IF NOT EXISTS idx_meeting_patterns_url ON meeting_patterns(url_pattern);
      """.trimIndent())
        }

        println("→→→→→→ Opened SQLite DB at ${dbFile.absolutePath}")
    }

    fun insertUrl(
        project: String,
        url: String? = null
    ) {
        conn.prepareStatement("""
      INSERT INTO urls (project, url)
      VALUES (?, ?)
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.setString(2, url)
            ps.executeUpdate()
        }
    }

    fun removeUrls(
        project: String
    ) {
        conn.prepareStatement("""
      DELETE FROM urls
      WHERE project = ?
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.executeUpdate()
        }
    }

    /**
     * Delete a specific URL pattern for a project.
     */
    fun deleteUrl(
        project: String,
        url: String
    ) {
        conn.prepareStatement("""
      DELETE FROM urls
      WHERE project = ? AND url = ?
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.setString(2, url)
            ps.executeUpdate()
        }
    }

    /**
     * Delete a specific URL pattern for a project.
     */
    fun deleteUrlById(
        id: Int
    ) {
        conn.prepareStatement("""
      DELETE FROM urls
      WHERE id = ?
    """.trimIndent()).use { ps ->
            ps.setInt(1, id)
            ps.executeUpdate()
        }
    }

    /**
     * Update a URL pattern by ID.
     */
    fun updateUrl(
        id: Int,
        project: String,
        url: String
    ) {
        conn.prepareStatement("""
      UPDATE urls
      SET project = ?, url = ?
      WHERE id = ?
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.setString(2, url)
            ps.setInt(3, id)
            ps.executeUpdate()
        }
    }

    fun queryUrls(project: String): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
      SELECT url FROM urls
        WHERE project = ?
      ORDER BY url DESC
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                rs.getString("url")?.let { obj.put("url", it) }
                arr.put(obj)
            }
        }
        return arr
    }

    fun queryAllUrls(): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
        SELECT id, project, url
        FROM urls
        ORDER BY project DESC
    """.trimIndent()).use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val obj = JSONObject()
                    // assume neither column is null in your schema;
                    // otherwise add null‐checks as needed
                    obj.put("id", rs.getInt("id"))
                    obj.put("project", rs.getString("project"))
                    obj.put("url",     rs.getString("url"))
                    arr.put(obj)
                }
            }
        }
        return arr
    }

    fun queryProjectByUrl(url: String): String? {
        val sql = """
      SELECT project 
        FROM urls
       WHERE url LIKE ?
    ORDER BY url DESC
       LIMIT 1
    """.trimIndent()

        conn.prepareStatement(sql).use { ps ->
            ps.setString(1, url)
            ps.executeQuery().use { rs ->
                return if (rs.next()) rs.getString("project") else null
            }
        }

    }

    fun insertSession(
        project: String,
        startIso: String,
        endIso: String,
        type: String,
        file: String? = null,
        host: String? = null,
        url: String? = null
    ) {
        val date = startIso.substringBefore('T')
        conn.prepareStatement("""
      INSERT INTO sessions (project, date, start, end, type, file, host, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.setString(2, date)
            ps.setString(3, startIso)
            ps.setString(4, endIso)
            ps.setString(5, type)
            ps.setString(6, file)
            ps.setString(7, host)
            ps.setString(8, url)
            ps.executeUpdate()
        }
    }

    fun updateSessionProject(sessionId: Int, newProject: String) {
        conn.prepareStatement("""
      UPDATE sessions
         SET project = ?
       WHERE id = ?
    """.trimIndent()).use { ps ->
            ps.setString(1, newProject)
            ps.setInt(2, sessionId)
            ps.executeUpdate()
        }
    }

    fun updateSessionsProject(sessionIds: List<Int>, newProject: String) {
        if (sessionIds.isEmpty()) return

        val placeholders = sessionIds.joinToString(",") { "?" }
        conn.prepareStatement("""
      UPDATE sessions
         SET project = ?
       WHERE id IN ($placeholders)
    """.trimIndent()).use { ps ->
            ps.setString(1, newProject)
            sessionIds.forEachIndexed { index, id ->
                ps.setInt(index + 2, id)
            }
            ps.executeUpdate()
        }
    }

    fun querySessions(fromDate: LocalDate, toDate: LocalDate): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
      SELECT * FROM sessions
      WHERE date BETWEEN ? AND ?
      ORDER BY start
    """.trimIndent()).use { ps ->
            ps.setString(1, fromDate.toString())
            ps.setString(2, toDate.toString())
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("project", rs.getString("project"))
                obj.put("date", rs.getString("date"))
                obj.put("start", rs.getString("start"))
                obj.put("end", rs.getString("end"))
                obj.put("type", rs.getString("type"))
                rs.getString("file")?.let { obj.put("file", it) }
                rs.getString("host")?.let { obj.put("host", it) }
                rs.getString("url")?.let { obj.put("url", it) }
                arr.put(obj)
            }
        }
        return arr
    }

    fun getAllSessions(): List<Session> {

        val sessions = mutableListOf<Session>()
        val rs = conn.prepareStatement("SELECT * FROM sessions").executeQuery()
        while (rs.next()) {
            sessions.add(
                Session(
                    id = rs.getInt("id"),
                    project = rs.getString("project"),
                    start = rs.getString("start"),
                    end = rs.getString("end"),
                    type = rs.getString("type"),
                    file = rs.getString("file"),
                    host = rs.getString("host"),
                    url = rs.getString("url")
                )
            )
        }
        return sessions
    }


    fun querySessionsByProject(project: String, fromDate: LocalDate, toDate: LocalDate): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
      SELECT * FROM sessions
      WHERE date BETWEEN ? AND ?
      ORDER BY start
    """.trimIndent()).use { ps ->
            ps.setString(1, fromDate.toString())
            ps.setString(2, toDate.toString())
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("project", rs.getString("project"))
                obj.put("date", rs.getString("date"))
                obj.put("start", rs.getString("start"))
                obj.put("end", rs.getString("end"))
                obj.put("type", rs.getString("type"))
                rs.getString("file")?.let { obj.put("file", it) }
                rs.getString("host")?.let { obj.put("host", it) }
                rs.getString("url")?.let { obj.put("url", it) }
                arr.put(obj)
            }
        }
        return arr
    }

    fun getAllActiveProjects(): JSONArray {

        val arr = JSONArray()
        conn.prepareStatement("""
      SELECT project, MAX("end") AS last_worked_on
        FROM sessions
        GROUP BY project
        ORDER BY last_worked_on DESC;
    """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("name", rs.getString("project"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun getAllProjectNames(): JSONArray {

        val arr = JSONArray()
        conn.prepareStatement("""
      SELECT * FROM project_names
    """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id",    rs.getInt("id"))
                obj.put("projectName", rs.getString("project_name"))
                obj.put("customName", rs.getString("custom_name"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun insertProjectName(
        project_name: String,
        custom_name: String
    ) {
        conn.prepareStatement("""
      INSERT INTO project_names (project_name, custom_name)
      VALUES (?, ?)
    """.trimIndent()).use { ps ->
            ps.setString(1, project_name)
            ps.setString(2, custom_name)
            ps.executeUpdate()
        }
    }

    fun updateProjectName(
        id: Int,
        customName: String
    ) {
        conn.prepareStatement("""
      UPDATE project_names SET custom_name = ?
      WHERE id = ?
    """.trimIndent()).use { ps ->
            ps.setString(1, customName)
            ps.setInt(2, id)
            ps.executeUpdate()
        }
    }

    /**
     * Delete a specific URL pattern for a project.
     */
    fun deleteProjectName(
        id: Int
    ) {
        conn.prepareStatement("""
      DELETE FROM project_names
      WHERE id = ?
    """.trimIndent()).use { ps ->
            ps.setInt(1, id)
            ps.executeUpdate()
        }
    }



    fun getAllIgnoredProjects(): JSONArray {

        val arr = JSONArray()
        conn.prepareStatement("""
      SELECT * FROM ignored_projects
    """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id",    rs.getInt("id"))
                obj.put("projectName", rs.getString("project_name"))
                obj.put("ignoredAt",   rs.getDate("ignored_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun insertIgnoredProject(
        project: String
    ) {
        conn.prepareStatement("""
      INSERT INTO ignored_projects (project_name)
      VALUES (?)
    """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.executeUpdate()
        }
    }

    /**
     * Delete a specific URL pattern for a project.
     */
    fun deleteIgnoredProject(
        id: Int
    ) {
        conn.prepareStatement("""
      DELETE FROM ignored_projects
      WHERE id = ?
    """.trimIndent()).use { ps ->
            ps.setInt(1, id)
            ps.executeUpdate()
        }
    }

    // ========== Wrike Project Mappings ==========

    fun getAllWrikeMappings(): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
            SELECT * FROM wrike_mappings
            ORDER BY project_name
        """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("projectName", rs.getString("project_name"))
                obj.put("wrikeProjectId", rs.getString("wrike_project_id"))
                obj.put("wrikeProjectTitle", rs.getString("wrike_title"))
                obj.put("wrikePermalink", rs.getString("wrike_permalink"))
                obj.put("createdAt", rs.getString("created_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun getWrikeMappingByProject(projectName: String): JSONObject? {
        conn.prepareStatement("""
            SELECT * FROM wrike_mappings
            WHERE project_name = ?
        """.trimIndent()).use { ps ->
            ps.setString(1, projectName)
            val rs = ps.executeQuery()
            if (rs.next()) {
                return JSONObject()
                    .put("id", rs.getInt("id"))
                    .put("projectName", rs.getString("project_name"))
                    .put("wrikeProjectId", rs.getString("wrike_project_id"))
                    .put("wrikeProjectTitle", rs.getString("wrike_title"))
                    .put("wrikePermalink", rs.getString("wrike_permalink"))
                    .put("createdAt", rs.getString("created_at"))
            }
        }
        return null
    }

    fun insertOrUpdateWrikeMapping(
        projectName: String,
        wrikeProjectId: String,
        wrikeTitle: String,
        wrikePermalink: String
    ) {
        conn.prepareStatement("""
            INSERT INTO wrike_mappings (project_name, wrike_project_id, wrike_title, wrike_permalink)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(project_name) DO UPDATE SET
                wrike_project_id = excluded.wrike_project_id,
                wrike_title = excluded.wrike_title,
                wrike_permalink = excluded.wrike_permalink,
                updated_at = CURRENT_TIMESTAMP
        """.trimIndent()).use { ps ->
            ps.setString(1, projectName)
            ps.setString(2, wrikeProjectId)
            ps.setString(3, wrikeTitle)
            ps.setString(4, wrikePermalink)
            ps.executeUpdate()
        }
    }

    fun deleteWrikeMapping(id: Int) {
        conn.prepareStatement("""
            DELETE FROM wrike_mappings
            WHERE id = ?
        """.trimIndent()).use { ps ->
            ps.setInt(1, id)
            ps.executeUpdate()
        }
    }

    fun deleteWrikeMappingByProject(projectName: String) {
        conn.prepareStatement("""
            DELETE FROM wrike_mappings
            WHERE project_name = ?
        """.trimIndent()).use { ps ->
            ps.setString(1, projectName)
            ps.executeUpdate()
        }
    }

    // ========== Project Clients ==========

    fun getAllProjectClients(): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
            SELECT * FROM project_clients
            ORDER BY client_name, project_name
        """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("projectName", rs.getString("project_name"))
                obj.put("clientName", rs.getString("client_name"))
                obj.put("updatedAt", rs.getString("updated_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun insertProjectClient(
        project_name: String,
        client_name: String
    ) {
        conn.prepareStatement("""
            INSERT INTO project_clients (project_name, client_name)
            VALUES (?, ?)
            ON CONFLICT(project_name) DO UPDATE SET
                client_name = excluded.client_name,
                updated_at = CURRENT_TIMESTAMP
        """.trimIndent()).use { ps ->
            ps.setString(1, project_name)
            ps.setString(2, client_name)
            ps.executeUpdate()
        }
    }

    fun updateProjectClient(
        id: Int,
        clientName: String
    ) {
        conn.prepareStatement("""
            UPDATE project_clients
            SET client_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """.trimIndent()).use { ps ->
            ps.setString(1, clientName)
            ps.setInt(2, id)
            ps.executeUpdate()
        }
    }

    fun deleteProjectClient(id: Int) {
        conn.prepareStatement("""
            DELETE FROM project_clients
            WHERE id = ?
        """.trimIndent()).use { ps ->
            ps.setInt(1, id)
            ps.executeUpdate()
        }
    }

    // ========== Commits ==========

    fun insertCommit(
        project: String,
        commitHash: String,
        commitMessage: String,
        branch: String?,
        authorName: String?,
        authorEmail: String?,
        commitTime: String,
        filesChanged: Int = 0,
        linesAdded: Int = 0,
        linesDeleted: Int = 0
    ) {
        conn.prepareStatement("""
            INSERT INTO commits (
                project, commit_hash, commit_message, branch,
                author_name, author_email, commit_time,
                files_changed, lines_added, lines_deleted
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """.trimIndent()).use { ps ->
            ps.setString(1, project)
            ps.setString(2, commitHash)
            ps.setString(3, commitMessage)
            ps.setString(4, branch)
            ps.setString(5, authorName)
            ps.setString(6, authorEmail)
            ps.setString(7, commitTime)
            ps.setInt(8, filesChanged)
            ps.setInt(9, linesAdded)
            ps.setInt(10, linesDeleted)
            ps.executeUpdate()
        }
    }

    fun getAllCommits(): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
            SELECT * FROM commits
            ORDER BY commit_time DESC
        """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("project", rs.getString("project"))
                obj.put("commitHash", rs.getString("commit_hash"))
                obj.put("commitMessage", rs.getString("commit_message"))
                obj.put("branch", rs.getString("branch"))
                obj.put("authorName", rs.getString("author_name"))
                obj.put("authorEmail", rs.getString("author_email"))
                obj.put("commitTime", rs.getString("commit_time"))
                obj.put("filesChanged", rs.getInt("files_changed"))
                obj.put("linesAdded", rs.getInt("lines_added"))
                obj.put("linesDeleted", rs.getInt("lines_deleted"))
                obj.put("createdAt", rs.getString("created_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun getCommitsByProject(project: String): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
            SELECT * FROM commits
            WHERE project = ?
            ORDER BY commit_time DESC
        """.trimIndent()).use { ps ->
            ps.setString(1, project)
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("project", rs.getString("project"))
                obj.put("commitHash", rs.getString("commit_hash"))
                obj.put("commitMessage", rs.getString("commit_message"))
                obj.put("branch", rs.getString("branch"))
                obj.put("authorName", rs.getString("author_name"))
                obj.put("authorEmail", rs.getString("author_email"))
                obj.put("commitTime", rs.getString("commit_time"))
                obj.put("filesChanged", rs.getInt("files_changed"))
                obj.put("linesAdded", rs.getInt("lines_added"))
                obj.put("linesDeleted", rs.getInt("lines_deleted"))
                obj.put("createdAt", rs.getString("created_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    fun getCommitsByDateRange(fromDate: String, toDate: String): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
            SELECT * FROM commits
            WHERE commit_time BETWEEN ? AND ?
            ORDER BY commit_time DESC
        """.trimIndent()).use { ps ->
            ps.setString(1, fromDate)
            ps.setString(2, toDate)
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("project", rs.getString("project"))
                obj.put("commitHash", rs.getString("commit_hash"))
                obj.put("commitMessage", rs.getString("commit_message"))
                obj.put("branch", rs.getString("branch"))
                obj.put("authorName", rs.getString("author_name"))
                obj.put("authorEmail", rs.getString("author_email"))
                obj.put("commitTime", rs.getString("commit_time"))
                obj.put("filesChanged", rs.getInt("files_changed"))
                obj.put("linesAdded", rs.getInt("lines_added"))
                obj.put("linesDeleted", rs.getInt("lines_deleted"))
                obj.put("createdAt", rs.getString("created_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    // ========== Meeting Patterns CRUD ==========

    /**
     * Insert or update a meeting pattern
     */
    fun insertOrUpdateMeetingPattern(
        projectName: String,
        urlPattern: String,
        meetingTitle: String? = null,
        description: String? = null,
        autoAssign: Boolean = true
    ) {
        conn.prepareStatement("""
            INSERT INTO meeting_patterns (project_name, url_pattern, meeting_title, description, auto_assign, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(url_pattern) DO UPDATE SET
                project_name = excluded.project_name,
                meeting_title = excluded.meeting_title,
                description = excluded.description,
                auto_assign = excluded.auto_assign,
                updated_at = CURRENT_TIMESTAMP
        """.trimIndent()).use { ps ->
            ps.setString(1, projectName)
            ps.setString(2, urlPattern)
            ps.setString(3, meetingTitle)
            ps.setString(4, description)
            ps.setInt(5, if (autoAssign) 1 else 0)
            ps.executeUpdate()
        }
    }

    /**
     * Find a matching project for a given meeting URL
     */
    fun findMeetingPattern(url: String): String? {
        conn.prepareStatement("""
            SELECT project_name FROM meeting_patterns
            WHERE auto_assign = 1 AND ? LIKE '%' || url_pattern || '%'
            ORDER BY length(url_pattern) DESC
            LIMIT 1
        """.trimIndent()).use { ps ->
            ps.setString(1, url)
            val rs = ps.executeQuery()
            if (rs.next()) {
                // Update last_used timestamp
                updateMeetingPatternLastUsed(url)
                return rs.getString("project_name")
            }
        }
        return null
    }

    /**
     * Update the last_used timestamp for a meeting pattern
     */
    private fun updateMeetingPatternLastUsed(url: String) {
        conn.prepareStatement("""
            UPDATE meeting_patterns
            SET last_used = CURRENT_TIMESTAMP
            WHERE ? LIKE '%' || url_pattern || '%'
        """.trimIndent()).use { ps ->
            ps.setString(1, url)
            ps.executeUpdate()
        }
    }

    /**
     * Get all meeting patterns
     */
    fun getAllMeetingPatterns(): JSONArray {
        val arr = JSONArray()
        conn.prepareStatement("""
            SELECT id, project_name, url_pattern, meeting_title, description, auto_assign,
                   last_used, created_at, updated_at
            FROM meeting_patterns
            ORDER BY last_used DESC, created_at DESC
        """.trimIndent()).use { ps ->
            val rs = ps.executeQuery()
            while (rs.next()) {
                val obj = JSONObject()
                obj.put("id", rs.getInt("id"))
                obj.put("projectName", rs.getString("project_name"))
                obj.put("urlPattern", rs.getString("url_pattern"))
                obj.put("meetingTitle", rs.getString("meeting_title"))
                obj.put("description", rs.getString("description"))
                obj.put("autoAssign", rs.getInt("auto_assign") == 1)
                obj.put("lastUsed", rs.getString("last_used"))
                obj.put("createdAt", rs.getString("created_at"))
                obj.put("updatedAt", rs.getString("updated_at"))
                arr.put(obj)
            }
        }
        return arr
    }

    /**
     * Delete a meeting pattern by ID
     */
    fun deleteMeetingPattern(id: Int) {
        conn.prepareStatement("DELETE FROM meeting_patterns WHERE id = ?").use { ps ->
            ps.setInt(1, id)
            ps.executeUpdate()
        }
    }

    /**
     * Update a meeting pattern's auto_assign flag
     */
    fun updateMeetingPatternAutoAssign(id: Int, autoAssign: Boolean) {
        conn.prepareStatement("""
            UPDATE meeting_patterns
            SET auto_assign = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """.trimIndent()).use { ps ->
            ps.setInt(1, if (autoAssign) 1 else 0)
            ps.setInt(2, id)
            ps.executeUpdate()
        }
    }
}
