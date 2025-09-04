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
                obj.put("project", rs.getString("project"))
                obj.put("date",    rs.getString("date"))
                obj.put("start",   rs.getString("start"))
                obj.put("end",     rs.getString("end"))
                obj.put("type",    rs.getString("type"))
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
            sessions.add(Session(
                project = rs.getString("project"),
                start = rs.getString("start"),
                end = rs.getString("end"),
                type = rs.getString("type"),
                file = rs.getString("file"),
                host = rs.getString("host"),
                url = rs.getString("url")
            ))
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
                obj.put("project", rs.getString("project"))
                obj.put("date",    rs.getString("date"))
                obj.put("start",   rs.getString("start"))
                obj.put("end",     rs.getString("end"))
                obj.put("type",    rs.getString("type"))
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
}
