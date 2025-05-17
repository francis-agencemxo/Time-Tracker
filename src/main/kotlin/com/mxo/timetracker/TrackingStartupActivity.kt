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
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.startup.ProjectActivity
import com.intellij.openapi.vfs.VirtualFile

class TrackingStartupActivity : ProjectActivity {
    private val logger = Logger.getInstance(TrackingStartupActivity::class.java)
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")
    private var seconds = 0
    private var currentFile: String? = null

    override suspend fun execute(project: Project) {
        println(" Time Tracker started for: ${project.name}")
        UserActivityTracker.register()

        // 🔍 Listen to file switch events
        project.messageBus.connect().subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun selectionChanged(event: FileEditorManagerEvent) {
                    val projectBase = project.basePath ?: ""
                    val fullPath = event.newFile?.path
                    currentFile = if (fullPath != null && fullPath.startsWith(projectBase)) {
                        fullPath.removePrefix(projectBase).removePrefix("/")
                    } else {
                        fullPath
                    }
                }
            }
        )

        val timer = Timer(1000, ActionListener {
            seconds++
            if (seconds % 60 == 0) {
                if (!UserActivityTracker.isIdle(project, 2 * 60 * 1000)) {
                    saveTime(project.name, 60, currentFile)

                    println("🕒 Added 60 seconds coding time to project '${project.name}', file: $currentFile")
                } else {
                    println("Idle or unfocused - skipping increment for ${project.name}")
                }
            }
        })
        timer.start()
    }

    private fun saveTime(projectName: String, secondsToAdd: Int, filePath: String?) {

        val today = LocalDate.now().toString()
        val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()

        val dayData = json.optJSONObject(today) ?: JSONObject()
        val projectData = dayData.optJSONObject(projectName) ?: JSONObject()

        // Update total project time
        val current = projectData.optInt("duration", 0)
        projectData.put("duration", current + secondsToAdd)

        // Track file-level time per date
        val filesObject = projectData.optJSONObject("files") ?: JSONObject()
        val dateFiles = filesObject.optJSONObject(today) ?: JSONObject()

        if (filePath != null) {
            val currentFileTime = dateFiles.optInt(filePath, 0)
            filesObject.put(filePath, currentFileTime + secondsToAdd)
            projectData.put("files", filesObject)
        }

        dayData.put(projectName, projectData)
        json.put(today, dayData)

        dataFile.parentFile.mkdirs()
        FileWriter(dataFile).use { it.write(json.toString(2)) }
    }

}
