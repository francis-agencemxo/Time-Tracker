package com.codepulse.timetracker

import com.intellij.openapi.project.Project
import com.intellij.openapi.diagnostic.Logger
import java.time.LocalDate
import java.io.File
import java.io.FileWriter
import javax.swing.Timer
import java.awt.event.ActionListener
import java.util.concurrent.ConcurrentHashMap
import org.json.JSONObject
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.startup.ProjectActivity
import org.json.JSONArray
import java.net.BindException
import java.net.InetSocketAddress
import java.net.Socket
import java.time.LocalDateTime

class TrackingStartupActivity : ProjectActivity {
    private val logger = Logger.getInstance(TrackingStartupActivity::class.java)
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")
    private val currentFileMap = ConcurrentHashMap<Project, String?>()
    private val timerMap = ConcurrentHashMap<Project, Timer>()
    private val secondsMap = ConcurrentHashMap<Project, Int>()

    fun isBrowsingServerRunning(): Boolean {
        return try {
            Socket().apply {
                soTimeout = 500
                connect(InetSocketAddress("localhost", BrowsingTrackerServer.port), 500)
                close()
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    override suspend fun execute(project: Project) {
        println("✅ Time Tracker started for: ${project.name}")

        try {
            BrowsingTrackerServer.start()
        } catch (e: BindException) {
            println("⚠️ Port already in use. Server may already be running.")
        }

        UserActivityTracker.register()

        val currentFileEditor = com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project).selectedFiles.firstOrNull()
        val projectBase = project.basePath ?: ""
        val fullPath = currentFileEditor?.path
        val relativePath = if (fullPath != null && fullPath.startsWith(projectBase)) {
            fullPath.removePrefix(projectBase).removePrefix("/")
        } else {
            fullPath
        }

        if (relativePath != null) {
            currentFileMap[project] = relativePath
        } else {
            // no file open → remove any old entry
            currentFileMap.remove(project)
        }

        // Listen to file switch events
        project.messageBus.connect().subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun selectionChanged(event: FileEditorManagerEvent) {
                    val projectBase = project.basePath ?: ""
                    val fullPath = event.newFile?.path
                    val relativePath = if (fullPath != null && fullPath.startsWith(projectBase)) {
                        fullPath.removePrefix(projectBase).removePrefix("/")
                    } else {
                        fullPath
                    }

                    if (relativePath != null) {
                        currentFileMap[project] = relativePath
                    } else {
                        // no file open → remove any old entry
                        currentFileMap.remove(project)
                    }
                }
            }
        )

        // Create a per-project timer
        val timer = Timer(1000, ActionListener {
            val seconds = secondsMap.getOrDefault(project, 0) + 1
            secondsMap[project] = seconds

            if (seconds % 60 == 0) {
                if (!UserActivityTracker.isIdle(project, 2 * 60 * 1000)) {
                    val currentFile = currentFileMap[project]
                    saveTime(project.name, 60, currentFile)
                    println("🕒 Added 60 seconds coding time to project '${project.name}', file: $currentFile")
                } else {
                    println("💤 Idle or unfocused - skipping increment for ${project.name}")
                }
            }
        })
        timer.start()
        timerMap[project] = timer

        val serverWatchdogTimer = Timer(1 * 60 * 1000) {
            if (!isBrowsingServerRunning()) {
                println("BrowsingTrackerServer is not running. Restarting...")
                try {
                    BrowsingTrackerServer.start()
                } catch (ex: Exception) {
                    println("Failed to restart BrowsingTrackerServer: ${ex.message}")
                }
            }
        }
        serverWatchdogTimer.start()
    }

    private fun saveTime(projectName: String, secondsToAdd: Int, filePath: String?) {
        val now   = LocalDateTime.now()
        val start = now.minusSeconds(secondsToAdd.toLong())
        DBManager.insertSession(
            project = projectName,
            startIso = start.toString(),
            endIso   = now.toString(),
            type      = "coding",
            file      = filePath
        )
    }
}
