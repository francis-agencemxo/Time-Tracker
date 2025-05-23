package com.codepulse.timetracker

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpHandler
import com.sun.net.httpserver.HttpServer
import org.json.JSONObject
import java.io.File
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.URL
import java.time.LocalDate
import com.intellij.notification.Notification
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.notification.Notifications
import com.intellij.openapi.application.ApplicationManager
import org.json.JSONArray
import java.time.LocalDateTime

object BrowsingTrackerServer {

    val port = 56000
    private var server: HttpServer? = null
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")

    fun start() {
        if (server != null) return // already started

        server = HttpServer.create(InetSocketAddress(port), 0)
        server?.createContext("/url-track", UrlTrackHandler())
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
                val url = URL(fullUrl)
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

        private fun findMatchingProject(url: String): String? {
            if (!dataFile.exists()) return null
            val config = JSONObject(dataFile.readText()).optJSONObject("config") ?: return null

            for (key in config.keySet()) {
                val urls = config.optJSONObject(key)?.optJSONArray("urls") ?: continue
                for (i in 0 until urls.length()) {
                    val u = urls.getString(i)
                    if (url.contains(u)) return key
                }
            }
            return null
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
