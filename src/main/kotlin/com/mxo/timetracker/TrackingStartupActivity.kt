package com.mxo.timetracker

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity
import com.intellij.openapi.diagnostic.Logger
import java.time.LocalDate
import java.io.File
import java.io.FileWriter
import javax.swing.Timer
import java.awt.event.ActionListener
import org.json.JSONObject

class TrackingStartupActivity : StartupActivity {
    private val logger = Logger.getInstance(TrackingStartupActivity::class.java)
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")
    private var seconds = 0

    override fun runActivity(project: Project) {
        logger.info("Time Tracker started for: ${project.name}")
        UserActivityTracker.register()

        val timer = Timer(1000, ActionListener {
            seconds++
            if (seconds % 60 == 0) {
                if (!UserActivityTracker.isIdle(project, 2 * 60 * 1000)) {
                    saveTime(project.name, 60)
                    logger.debug("+60s for ${project.name}")
                } else {
                    logger.debug("Idle or unfocused - skipping increment for ${project.name}")
                }
            }
        })
        timer.start()
    }

    private fun saveTime(projectName: String, secondsToAdd: Int) {
        val today = LocalDate.now().toString()
        val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()

        val dayData = json.optJSONObject(today) ?: JSONObject()
        val projectData = dayData.optJSONObject(projectName) ?: JSONObject()

        val current = projectData.optInt("duration", 0)
        projectData.put("duration", current + secondsToAdd)

        dayData.put(projectName, projectData)
        json.put(today, dayData)

        dataFile.parentFile.mkdirs()
        FileWriter(dataFile).use { it.write(json.toString(2)) }
    }
}
