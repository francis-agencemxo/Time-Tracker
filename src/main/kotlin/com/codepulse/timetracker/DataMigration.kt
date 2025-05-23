package com.codepulse.timetracker

import org.json.JSONObject
import java.io.File

/**
 * One-time migration of JSON history → SQLite.
 * Run this (e.g. via IntelliJ’s “Run”) and then remove the JSON file.
 */
fun main() {
    // 1) Locate the old JSON
    val dataFile = File(System.getProperty("user.home"), ".cache/phpstorm-time-tracker/data.json")
    if (!dataFile.exists()) {
        println("No JSON data found at ${dataFile.absolutePath}, nothing to migrate.")
        return
    }

    // 2) Parse entire JSON
    val rootJson = JSONObject(dataFile.readText())

    // 3) For each date key (skip "config")
    for (dateKey in rootJson.keySet()) {
        if (dateKey == "config") continue

        val dayData = rootJson.getJSONObject(dateKey)

        // 4) For each project under that date
        for (projectName in dayData.keySet()) {
            val projectData = dayData.getJSONObject(projectName)
            val historyArray = projectData.optJSONArray("history") ?: continue

            // 5) For each history entry, pull out all fields
            for (i in 0 until historyArray.length()) {
                val entry = historyArray.getJSONObject(i)
                val startIso = entry.getString("start")
                val endIso   = entry.getString("end")
                val type     = entry.getString("type")

                // optional fields
                val file     = entry.optString("file",  null)
                val host     = entry.optString("host",  null)
                val url      = entry.optString("url",   null)

                // 6) Insert into SQLite
                DBManager.insertSession(
                    project   = projectName,
                    startIso  = startIso,
                    endIso    = endIso,
                    type      = type,
                    file      = file,
                    host      = host,
                    url       = url
                )
            }
        }
    }

    // 7) (Optional) remove the old JSON so nothing is double-migrated
    if (dataFile.delete()) {
        println("Migration complete; deleted ${dataFile.absolutePath}")
    } else {
        println("Migration complete; failed to delete ${dataFile.absolutePath}")
    }
}
