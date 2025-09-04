package com.codepulse.timetracker.sync

import com.codepulse.timetracker.settings.TimeTrackerSettings
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import javax.swing.Timer

object DailySyncManager {
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")
    private val lastSyncFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/last-sync.txt")
    private const val SYNC_URL = "https://addons.francislabonte.com/project-sync"

    fun scheduleDailySync() {
        val delayMinutes = TimeTrackerSettings.getInstance().state.syncDelayMinutes
        Timer(delayMinutes * 60 * 1000) {
            trySync()
        }.apply { isRepeats = false }.start()
    }

    private fun trySync() {
        val today = LocalDate.now().toString()
        val alreadySynced = lastSyncFile.exists() && lastSyncFile.readText() == today
        if (alreadySynced) return

        val summary = buildDailySummary() ?: return
        send(summary)
        lastSyncFile.writeText(today)
    }

    private fun buildDailySummary(): JSONObject? {
        if (!dataFile.exists()) return null
        val json = JSONObject(dataFile.readText())

        val today = LocalDate.now().toString()
        val dayData = json.optJSONObject(today) ?: return null

        val result = JSONObject()
        result.put("date", today)

        val projects = JSONObject()
        for (project in dayData.keySet()) {
            val obj = dayData.getJSONObject(project)
            val projectSummary = JSONObject()
            projectSummary.put("duration", obj.optInt("duration", 0))
            projectSummary.put("history", obj.optJSONArray("history") ?: JSONArray())
            projects.put(project, projectSummary)
        }

        result.put("projects", projects)
        return result
    }

    private fun send(summary: JSONObject) {
        try {
            val connection = URL(SYNC_URL).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            connection.outputStream.use { it.write(summary.toString().toByteArray()) }

            val responseCode = connection.responseCode
            val response = connection.inputStream.bufferedReader().readText()
            println("✅ Sync success [$responseCode]: $response")
        } catch (e: Exception) {
            println("❌ Sync failed: ${e.message}")
        }
    }
}
