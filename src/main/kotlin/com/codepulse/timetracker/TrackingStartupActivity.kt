package com.codepulse.timetracker

import com.codepulse.timetracker.license.LicenseDialog
import com.codepulse.timetracker.license.LicenseStateService
import com.codepulse.timetracker.license.LicenseValidator
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
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
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileDocumentManagerListener
import com.intellij.openapi.startup.ProjectActivity
import com.intellij.openapi.ui.Messages
import org.json.JSONArray
import java.net.BindException
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL
import java.nio.file.*
import java.time.LocalDateTime

class TrackingStartupActivity : ProjectActivity {
    private val logger = Logger.getInstance(TrackingStartupActivity::class.java)
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")
    private val currentFileMap = ConcurrentHashMap<Project, String?>()
    private val timerMap = ConcurrentHashMap<Project, Timer>()
    private val secondsMap = ConcurrentHashMap<Project, Int>()
    private val lastSaveTimeMap = ConcurrentHashMap<String, Long>()

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
        extractChromeExtensionIfNeeded() // ← Add this line early in startup

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
            currentFileMap.remove(project)
        }

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
                        currentFileMap.remove(project)
                    }
                }
            }
        )

        // Listen for file saves
        ApplicationManager.getApplication().messageBus.connect().subscribe(
            FileDocumentManagerListener.TOPIC,
            object : FileDocumentManagerListener {
                override fun beforeDocumentSaving(document: com.intellij.openapi.editor.Document) {
                    val file = FileDocumentManager.getInstance().getFile(document) ?: return
                    val filePath = file.path

                    // Check if this file belongs to the current project
                    val projectBase = project.basePath ?: return
                    if (!filePath.startsWith(projectBase)) return

                    val relativePath = filePath.removePrefix(projectBase).removePrefix("/")

                    // Avoid recording saves too frequently (throttle to once per 5 seconds per file)
                    val now = System.currentTimeMillis()
                    val lastSave = lastSaveTimeMap[filePath] ?: 0
                    if (now - lastSave < 5000) return

                    lastSaveTimeMap[filePath] = now

                    // Record a short session for the file save
                    if (!UserActivityTracker.isIdle(project, 2 * 60 * 1000)) {
                        saveTime(project.name, 10, relativePath)
                        println("💾 Recorded file save: $relativePath")
                    }
                }
            }
        )

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

        val serverWatchdogTimer = Timer(60_000) {
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

    private fun extractChromeExtensionIfNeeded() {
        val outputDir = File(System.getProperty("user.home"), ".cache/phpstorm-time-tracker/chrome-extension")
        val localVersionFile = File(outputDir, "version.txt")
        val jarVersionStream = javaClass.classLoader.getResourceAsStream("chrome-extension/version.txt")

        val jarVersion = jarVersionStream?.bufferedReader()?.readText()?.trim()
        val localVersion = if (localVersionFile.exists()) localVersionFile.readText().trim() else null

        if (jarVersion != null && jarVersion == localVersion && outputDir.exists()) {
            return // up to date, skip extraction
        }

        try {
            println("📦 Updating Chrome extension files...")

            // clean previous
            if (outputDir.exists()) outputDir.deleteRecursively()

            val manifestUrl = javaClass.classLoader.getResource("chrome-extension/manifest.json")
                ?: return println("⚠️ manifest.json not found in JAR (chrome-extension)")

            val jarUri = manifestUrl.toURI()
            val fs = if (jarUri.scheme == "jar") FileSystems.newFileSystem(jarUri, emptyMap<String, Any>()) else FileSystems.getDefault()

            val jarRoot = fs.getPath("/chrome-extension")
            Files.walk(jarRoot).forEach { path ->
                val relative = jarRoot.relativize(path).toString()
                val outFile = File(outputDir, relative)
                if (Files.isDirectory(path)) {
                    outFile.mkdirs()
                } else {
                    outFile.parentFile.mkdirs()
                    Files.copy(path, outFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
                }
            }

            println("✅ Extracted Chrome extension to ${outputDir.absolutePath}")
        } catch (e: Exception) {
            println("❌ Failed to extract Chrome extension: ${e.message}")
        }
    }
}
