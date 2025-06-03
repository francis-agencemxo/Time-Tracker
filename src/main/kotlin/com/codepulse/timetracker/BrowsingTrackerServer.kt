package com.codepulse.timetracker

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
import org.json.JSONArray
import java.time.Duration
import java.time.LocalDateTime
import java.net.URI

object BrowsingTrackerServer {

    val port: Int = System.getProperty("trackerServerPort")?.toIntOrNull()
        ?: System.getenv("TRACKER_SERVER_PORT")?.toIntOrNull()
        ?: 56000
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
            // CORS support for dev-mode cross-origin requests
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


    fun start() {
        if (server != null) return // already started

        server = HttpServer.create(InetSocketAddress(port), 0)
        server?.createContext("/url-track", UrlTrackHandler())
        server?.createContext("/", StaticFileHandler())
        server?.createContext("/api/stats", StatsHandler())
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
                val uri = URI.create(fullUrl)        // parse and validate as a URI
                val url = uri.toURL()                // convert to URL instance
                val host = url.host  // "ihr.local"

                val duration = json.getLong("duration")

                val matchedProject = findMatchingProject(host)
                if (matchedProject != null) {
                    addBrowsingTime(matchedProject, host, fullUrl, duration)
                    println("🕒 Added $duration seconds browsing time to project '$matchedProject' from $url")
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
