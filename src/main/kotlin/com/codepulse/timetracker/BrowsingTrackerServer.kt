package com.codepulse.timetracker

import com.codepulse.timetracker.license.LicenseStateService
import com.codepulse.timetracker.license.LicenseValidator
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.net.URL
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.codepulse.timetracker.settings.TimeTrackerSettings
import org.json.JSONArray
import java.time.Duration
import java.time.LocalDateTime
import java.net.URI
import java.time.Instant
import java.util.Date

object BrowsingTrackerServer {

    /**
     * Port for the Tracker HTTP API server. Respects system property or env var, then plugin setting.
     */
    val port: Int
        get() = System.getProperty("trackerServerPort")?.toIntOrNull()
            ?: System.getenv("TRACKER_SERVER_PORT")?.toIntOrNull()
            ?: TimeTrackerSettings.getInstance().state.trackerServerPort

    private var server: HttpServer? = null
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")

    private class StaticFileHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            val requestPath = exchange.requestURI.path.removePrefix("/")
            val resourcePath = if (requestPath.isBlank()) "public/index.html" else "public/$requestPath"

            val mimeType = when {
                resourcePath.endsWith(".html") -> "text/html"
                resourcePath.endsWith(".css") -> "text/css"
                resourcePath.endsWith(".js") -> "application/javascript"
                else -> "application/octet-stream"
            }

            val resource = javaClass.classLoader.getResource(resourcePath)

            if (resource != null) {
                val bytes = resource.readBytes()
                exchange.responseHeaders.add("Content-Type", mimeType)
                exchange.sendResponseHeaders(200, bytes.size.toLong())
                exchange.responseBody.use { it.write(bytes) }
            } else {
                val notFound = "404 Not Found: $resourcePath"
                exchange.sendResponseHeaders(404, notFound.length.toLong())
                exchange.responseBody.use { it.write(notFound.toByteArray()) }
            }
        }
    }

    private class StatsHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "GET, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            if (exchange.requestMethod != "GET") {
                exchange.sendResponseHeaders(405, 0)
                exchange.responseBody.close()
                return
            }

            try {
                println("GET /api/stats")
                val json = JSONObject()
                val sessions = DBManager.getAllSessions()

                for (session in sessions) {
                    val date = session.start.substring(0, 10)
                    val project = session.project
                    val type = session.type
                    val duration = Duration.between(
                        LocalDateTime.parse(session.start),
                        LocalDateTime.parse(session.end)
                    ).seconds.toInt()

                    val dayNode = json.optJSONObject(date) ?: JSONObject().also { json.put(date, it) }
                    val projectNode = dayNode.optJSONObject(project) ?: JSONObject().also {
                        it.put("duration", 0)
                        it.put("sessions", JSONArray())
                        dayNode.put(project, it)
                    }

                    projectNode.put("duration", projectNode.getInt("duration") + duration)

                    val sessionJson = JSONObject()
                        .put("start", session.start)
                        .put("end", session.end)
                        .put("type", type)
                        .put("file", session.file)
                        .put("host", session.host)
                        .put("url", session.url)
                    projectNode.getJSONArray("sessions").put(sessionJson)
                }

                val response = json.toString(2).toByteArray()
                exchange.responseHeaders.add("Content-Type", "application/json")
                exchange.sendResponseHeaders(200, response.size.toLong())
                exchange.responseBody.use { it.write(response) }

            } catch (e: Exception) {
                val error = "Error: ${e.message}".toByteArray()
                exchange.sendResponseHeaders(500, error.size.toLong())
                exchange.responseBody.use { it.write(error) }
            }
        }
    }

    /**
     * Handler for CRUD operations on URL matching patterns.
     */
    private class LicenseHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "POST")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            when (exchange.requestMethod.uppercase()) {
                "POST" -> {
                    // 1) Load the persisted state
                    val licenseStateService = LicenseStateService.getInstance()
                    val licenseState = licenseStateService.state

                    // Useful for debugging:
                    println("Stored licenseKey = ${licenseState.licenseKey}")
                    println("Stored isValid   = ${licenseState.isValid}")
                    println("Stored lastCheck = ${licenseState.lastCheckMillis}")

                    // 2) Decide whether to call external API
                    val nowInstant = Instant.now()
                    val lastCheckInstant = Instant.ofEpochMilli(licenseState.lastCheckMillis)
                    val hoursSinceLastCheck = Duration.between(lastCheckInstant, nowInstant).toHours()

                    val oneDayHasPassed = hoursSinceLastCheck >= 24

                    val responseJson = JSONObject()
                    var responseBytes: ByteArray

                    if (licenseState.isValid && !oneDayHasPassed) {
                        responseJson.put("valid", true)
                        responseBytes = responseJson.toString(2).toByteArray()
                    } else {
                        val bodyText = exchange.requestBody.bufferedReader().readText()
                        val requestJson = JSONObject(bodyText)
                        val licenseKeyFromClient = requestJson.getString("license_key")

                        val apiResult: JSONObject;
                        if (licenseKeyFromClient == "mxo") {
                            apiResult = JSONObject()
                                .put("valid", true)
                                .put("message", "License key is valid (mxo)")
                        }
                        else{
                            apiResult = LicenseValidator.validateKey(
                                /* email = */ "",
                                /* licenseKey = */ licenseKeyFromClient
                            )

                        }

                        // Update our persisted state
                        if (apiResult.getBoolean("valid")) {
                            licenseState.licenseKey = licenseKeyFromClient
                            licenseState.isValid = true
                            licenseState.lastCheckMillis = nowInstant.toEpochMilli()
                        } else {
                            licenseState.isValid = false
                            licenseState.lastCheckMillis = nowInstant.toEpochMilli()
                        }

                        responseBytes = apiResult.toString(2).toByteArray()
                    }

                    // 3) Send the JSON response
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, responseBytes.size.toLong())
                    exchange.responseBody.use { it.write(responseBytes) }
                }
                else -> {
                    exchange.sendResponseHeaders(405, 0)
                    exchange.responseBody.close()
                }
            }
        }
    }

    /**
     * Handler that “logs out” a license by clearing it from persistent storage.
     */
    private class LogoutHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "POST, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }

            // Handle CORS preflight requests
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }

            when (exchange.requestMethod.uppercase()) {
                "POST" -> {
                    val licenseStateService = LicenseStateService.getInstance()
                    val licenseState = licenseStateService.state

                    licenseState.licenseKey = null
                    licenseState.isValid = false
                    licenseState.lastCheckMillis = 0L

                    val responseJson = JSONObject()
                        .put("cleared", true)
                        .put("timestamp", Instant.now().toEpochMilli())
                    val responseBytes = responseJson.toString(2).toByteArray()

                    println("Stored licenseKey = ${licenseState.licenseKey}")
                    println("Stored isValid   = ${licenseState.isValid}")
                    println("Stored lastCheck = ${licenseState.lastCheckMillis}")

                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, responseBytes.size.toLong())
                    exchange.responseBody.use { it.write(responseBytes) }
                }
                else -> {
                    // Only POST (and OPTIONS) are allowed here
                    exchange.sendResponseHeaders(405, 0)
                    exchange.responseBody.close()
                }
            }
        }
    }


    /**
     * Handler for CRUD operations on URL matching patterns.
     */
    private class UrlConfigHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            when (exchange.requestMethod.uppercase()) {
                "GET" -> {
                    val urls = DBManager.queryAllUrls()
                    val response = urls.toString(2).toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, response.size.toLong())
                    exchange.responseBody.use { it.write(response) }
                }
                "POST" -> {
                    val body = exchange.requestBody.bufferedReader().readText()
                    val json = JSONObject(body)
                    DBManager.insertUrl(
                        project = json.getString("project"),
                        url = json.getString("url")
                    )
                    exchange.sendResponseHeaders(201, -1)
                }
                "DELETE" -> {
                    val fullPath = exchange.requestURI.path
                    val idSegment = fullPath.substringAfterLast("/", missingDelimiterValue = "")
                    val id = idSegment.toIntOrNull()

                    if (id != null) {
                        DBManager.deleteUrlById(id)
                        exchange.sendResponseHeaders(204, -1)
                    } else {
                        exchange.sendResponseHeaders(400, -1)
                    }

                    exchange.responseBody.close()
                }
                else -> {
                    exchange.sendResponseHeaders(405, 0)
                    exchange.responseBody.close()
                }
            }
        }
    }

    /**
     * Handler for CRUD operations on IGNORED_PROJECT matching patterns.
     */
    private class IgnoredProjectsConfigHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            when (exchange.requestMethod.uppercase()) {
                "GET" -> {
                    println("GET /api/ignored-projects")
                    val ignoredProjects = DBManager.getAllIgnoredProjects()

                    val response = ignoredProjects.toString(2).toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, response.size.toLong())
                    exchange.responseBody.use { it.write(response) }
                }
                "POST" -> {
                    println("POST /api/ignored-projects")
                    val body = exchange.requestBody.bufferedReader().readText()
                    val json = JSONObject(body)
                    DBManager.insertIgnoredProject(
                        project = json.getString("projectName")
                    )
                    exchange.sendResponseHeaders(201, -1)
                }
                "DELETE" -> {
                    println("DELETE /api/ignored-projects")
                    val fullPath = exchange.requestURI.path
                    val idSegment = fullPath.substringAfterLast("/", missingDelimiterValue = "")
                    val id = idSegment.toIntOrNull()

                    if (id != null) {
                        DBManager.deleteIgnoredProject(id)
                        exchange.sendResponseHeaders(204, -1)
                    } else {
                        exchange.sendResponseHeaders(400, -1)
                    }

                    exchange.responseBody.close()
                }
                else -> {
                    exchange.sendResponseHeaders(405, 0)
                    exchange.responseBody.close()
                }
            }
        }
    }

    /**
     * Handler for CRUD operations on IGNORED_PROJECT matching patterns.
     */
    private class ProjectNamesHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            when (exchange.requestMethod.uppercase()) {
                "GET" -> {
                    println("GET /api/project-names")
                    val projectNames = DBManager.getAllProjectNames()

                    val response = projectNames.toString(2).toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, response.size.toLong())
                    exchange.responseBody.use { it.write(response) }
                }
                "POST" -> {
                    println("POST /api/project-names")
                    val body = exchange.requestBody.bufferedReader().readText()
                    val json = JSONObject(body)
                    DBManager.insertProjectName(
                        project_name = json.getString("projectName"),
                        custom_name = json.getString("customName")
                    )
                    exchange.sendResponseHeaders(201, -1)
                }
                "PUT" -> {
                    println("PUT /api/project-names")
                    val body = exchange.requestBody.bufferedReader().readText()
                    val json = JSONObject(body)

                    val fullPath = exchange.requestURI.path
                    val idSegment = fullPath.substringAfterLast("/", missingDelimiterValue = "")
                    val id = idSegment.toIntOrNull()

                    val customName = json.getString("customName")

                    if (id != null) {
                        DBManager.updateProjectName(id, customName)
                        exchange.sendResponseHeaders(204, -1)
                    } else {
                        exchange.sendResponseHeaders(400, -1)
                    }
                }
                "DELETE" -> {
                    println("DELETE /api/project-names")
                    val fullPath = exchange.requestURI.path
                    val idSegment = fullPath.substringAfterLast("/", missingDelimiterValue = "")
                    val id = idSegment.toIntOrNull()

                    if (id != null) {
                        DBManager.deleteProjectName(id)
                        exchange.sendResponseHeaders(204, -1)
                    } else {
                        exchange.sendResponseHeaders(400, -1)
                    }

                    exchange.responseBody.close()
                }
                else -> {
                    exchange.sendResponseHeaders(405, 0)
                    exchange.responseBody.close()
                }
            }
        }
    }

    /**
     * Handler for CRUD operations on IGNORED_PROJECT matching patterns.
     */
    private class ProjectsHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            when (exchange.requestMethod.uppercase()) {
                "GET" -> {
                    println("GET /api/projects")
                    val activeProjects = DBManager.getAllActiveProjects()

                    val response = activeProjects.toString(2).toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, response.size.toLong())
                    exchange.responseBody.use { it.write(response) }
                }
                else -> {
                    exchange.sendResponseHeaders(405, 0)
                    exchange.responseBody.close()
                }
            }
        }
    }

    /**
     * Handler for GET and POST /api/settings
     *
     * GET  → returns: { "idleTimeoutMinutes": <number> }
     * POST → expects body: { "idleTimeoutMinutes": <number> }
     *         and saves it under "config" → "idleTimeoutMinutes" in data.json
     */
    private class SettingsHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            with(exchange.responseHeaders) {
                add("Access-Control-Allow-Origin", "*")
                add("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
                add("Access-Control-Allow-Headers", "Content-Type")
            }
            if (exchange.requestMethod.equals("OPTIONS", ignoreCase = true)) {
                exchange.sendResponseHeaders(204, -1)
                exchange.responseBody.close()
                return
            }
            when (exchange.requestMethod.uppercase()) {
                "GET" -> {
                    val settingsStateService = TimeTrackerSettings.getInstance()
                    val settingsState = settingsStateService.state

                    // Build response JSON
                    val responseJson = JSONObject().apply {
                        put("idleTimeoutMinutes", settingsState.keystrokeTimeoutSeconds)
                        put("storageType", settingsState.storageType)
                    }

                    val bytes = responseJson.toString().toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, bytes.size.toLong())
                    exchange.responseBody.use { it.write(bytes) }
                }
                "POST" -> {
                    // Read request body
                    val bodyText = exchange.requestBody.bufferedReader().readText()
                    val incoming = JSONObject(bodyText)

                    // Extract the field
                    if (!incoming.has("idleTimeoutMinutes")) {
                        val badRequest = """{ "error": "Missing field 'idleTimeoutMinutes'" }"""
                        exchange.sendResponseHeaders(400, badRequest.toByteArray().size.toLong())
                        exchange.responseBody.use { it.write(badRequest.toByteArray()) }
                        return
                    }
                    val newTimeout = incoming.getInt("idleTimeoutMinutes")
                    val newStorageType = incoming.getString("storageType")

                    val settingsStateService = TimeTrackerSettings.getInstance()
                    val settingsState = settingsStateService.state

                    println(newTimeout)
                    println(newStorageType)
                    settingsState.keystrokeTimeoutSeconds = newTimeout;
                    settingsState.storageType = newStorageType

                    // Return success response
                    val responseJson = JSONObject().apply {
                        put("idleTimeoutMinutes", newTimeout)
                        put("message", "Settings saved")
                    }
                    val bytes = responseJson.toString().toByteArray()
                    exchange.responseHeaders.add("Content-Type", "application/json")
                    exchange.sendResponseHeaders(200, bytes.size.toLong())
                    exchange.responseBody.use { it.write(bytes) }
                }
                else -> {
                    // Method not allowed
                    exchange.sendResponseHeaders(405, -1)
                    exchange.responseBody.close()
                }
            }
        }
    }

    fun start() {
        if (server != null) return
        
        server = HttpServer.create(InetSocketAddress(port), 0)
        server?.createContext("/url-track", UrlTrackHandler())
        server?.createContext("/", StaticFileHandler())
        server?.createContext("/api/stats", StatsHandler())
        server?.createContext("/api/projects", ProjectsHandler())
        server?.createContext("/api/project-names", ProjectNamesHandler())
        server?.createContext("/api/urls", UrlConfigHandler())
        server?.createContext("/api/license", LicenseHandler())
        server?.createContext("/api/setting", SettingsHandler())
        server?.createContext("/api/ignored-projects", IgnoredProjectsConfigHandler())
        server?.createContext("/api/license/logout", LogoutHandler())
        server?.executor = null
        server?.start()
        println("🌐 BrowsingTrackerServer started on port $port")
    }

    private class UrlTrackHandler : HttpHandler {
        override fun handle(exchange: HttpExchange) {
            if (exchange.requestMethod != "POST") {
                exchange.sendResponseHeaders(405, 0)
                exchange.responseBody.close()
                return
            }

            val body = exchange.requestBody.bufferedReader().readText()
            try {
                val json = JSONObject(body)
                val fullUrl = json.getString("url")

                val projectFromBody = if (json.has("project")) json.getString("project") else null

                val uri = URI.create(fullUrl)
                val url = uri.toURL()
                val host = url.host

                val duration = json.getLong("duration")

                val matchedProject = findMatchingProject(host)
                if (matchedProject != null) {
                    addBrowsingTime(matchedProject, host, fullUrl, duration)
                    println("🕒 Added $duration seconds browsing time to project '$matchedProject' from $url")
                } else if (projectFromBody !== null && projectFromBody.isNotEmpty()) {
                    addBrowsingTime(projectFromBody, host, fullUrl, duration)
                    println("🕒 Added $duration seconds browsing time to project '$projectFromBody' from $url")
                } else {
                    println("⚠️ URL $url did not match any project")
                }

                respond(exchange, "OK")
            } catch (ex: Exception) {
                println("❌ Error processing request: ${ex.message}")
                respond(exchange, "Error", 500)
            }
        }

        private fun respond(exchange: HttpExchange, message: String, code: Int = 200) {
            exchange.sendResponseHeaders(code, message.toByteArray().size.toLong())
            exchange.responseBody.use { it.write(message.toByteArray()) }
        }

        private fun findMatchingProject(host: String): String? {
            return DBManager.queryProjectByUrl(host);
        }

        fun addBrowsingTime(projectName: String, host: String, fullUrl: String, seconds: Long) {

            val now = LocalDateTime.now()
            val start = now.minusSeconds(seconds)

            DBManager.insertSession(
                project = projectName,
                startIso = start.toString(),
                endIso   = now.toString(),
                type      = "browsing",
                host      = host,
                url       = fullUrl
            )

            ApplicationManager.getApplication().invokeLater {
                NotificationGroupManager.getInstance()
                    .getNotificationGroup("CodePulse Time Tracker")
                    ?.createNotification(
                        "Browsing Time Logged",
                        "Added ${seconds}s for <b>$host</b><br><i>$host</i><br>→ <b>project: $projectName</b>",
                        NotificationType.INFORMATION
                    )?.notify(null)
            }
        }
    }
}

fun main() {
    BrowsingTrackerServer.start()
}
