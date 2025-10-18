package com.codepulse.timetracker

import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.vcs.CheckinProjectPanel
import com.intellij.openapi.vcs.changes.CommitContext
import com.intellij.openapi.vcs.checkin.CheckinHandler
import com.intellij.openapi.vcs.checkin.CheckinHandlerFactory
import git4idea.repo.GitRepositoryManager
import git4idea.GitUtil
import java.net.HttpURLConnection
import java.net.URI
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import org.json.JSONObject

/**
 * Factory that creates commit handlers to capture Git commits
 */
class GitCommitListenerFactory : CheckinHandlerFactory() {
    override fun createHandler(panel: CheckinProjectPanel, commitContext: CommitContext): CheckinHandler {
        return GitCommitHandler(panel)
    }
}

/**
 * Handler that intercepts Git commits and records them to the database via API
 */
class GitCommitHandler(private val panel: CheckinProjectPanel) : CheckinHandler() {
    private val logger = Logger.getInstance(GitCommitHandler::class.java)

    override fun checkinSuccessful() {
        super.checkinSuccessful()

        val project = panel.project
        val commitMessage = panel.commitMessage ?: ""
        if (commitMessage.isEmpty()) return

        try {
            recordCommit(project, commitMessage)
        } catch (e: Exception) {
            logger.warn("Failed to record commit", e)
        }
    }

    private fun recordCommit(project: Project, commitMessage: String) {
        val projectName = project.name

        // Get Git repository information
        val repositoryManager = GitRepositoryManager.getInstance(project)
        val repositories = repositoryManager.repositories

        if (repositories.isEmpty()) {
            logger.info("No Git repositories found in project")
            return
        }

        // Use the first repository (most projects have one main repo)
        val repository = repositories.first()
        val currentBranch = repository.currentBranch?.name

        // Get the latest commit from the repository
        val lastCommit = repository.currentRevision

        if (lastCommit == null) {
            logger.warn("Could not retrieve latest commit hash")
            return
        }

        // Get commit details from Git
        val commitHash = lastCommit
        val changes = panel.selectedChanges
        val filesChanged = changes.size

        // Calculate lines added/deleted
        var linesAdded = 0
        var linesDeleted = 0

        for (change in changes) {
            try {
                val beforeRevision = change.beforeRevision
                val afterRevision = change.afterRevision

                val beforeContent = beforeRevision?.content?.lines() ?: emptyList()
                val afterContent = afterRevision?.content?.lines() ?: emptyList()

                // Simple diff: count added and deleted lines
                val beforeSize = beforeContent.size
                val afterSize = afterContent.size

                if (afterSize > beforeSize) {
                    linesAdded += (afterSize - beforeSize)
                } else if (beforeSize > afterSize) {
                    linesDeleted += (beforeSize - afterSize)
                }
            } catch (e: Exception) {
                logger.debug("Failed to calculate line changes for ${change.virtualFile?.path}", e)
            }
        }

        // Get current user info from Git config
        var authorName: String? = null
        var authorEmail: String? = null

        try {
            // Try to read from git config using ProcessBuilder
            val nameProcess = ProcessBuilder("git", "config", "user.name")
                .directory(repository.root.toNioPath().toFile())
                .start()
            authorName = nameProcess.inputStream.bufferedReader().readText().trim()
            if (authorName.isNullOrBlank()) authorName = null

            val emailProcess = ProcessBuilder("git", "config", "user.email")
                .directory(repository.root.toNioPath().toFile())
                .start()
            authorEmail = emailProcess.inputStream.bufferedReader().readText().trim()
            if (authorEmail.isNullOrBlank()) authorEmail = null
        } catch (e: Exception) {
            logger.debug("Failed to read git config", e)
        }

        // Format current time in ISO 8601 format
        val commitTime = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)

        // Send to API
        sendCommitToApi(
            project = projectName,
            commitHash = commitHash,
            commitMessage = commitMessage,
            branch = currentBranch,
            authorName = authorName,
            authorEmail = authorEmail,
            commitTime = commitTime,
            filesChanged = filesChanged,
            linesAdded = linesAdded,
            linesDeleted = linesDeleted
        )

        logger.info("Recorded commit: $commitHash in project $projectName")
        println("📝 Recorded commit: $commitHash for project '$projectName' on branch '$currentBranch'")
    }

    private fun sendCommitToApi(
        project: String,
        commitHash: String,
        commitMessage: String,
        branch: String?,
        authorName: String?,
        authorEmail: String?,
        commitTime: String,
        filesChanged: Int,
        linesAdded: Int,
        linesDeleted: Int
    ) {
        val json = JSONObject().apply {
            put("project", project)
            put("commitHash", commitHash)
            put("commitMessage", commitMessage)
            put("branch", branch ?: "")
            put("authorName", authorName ?: "")
            put("authorEmail", authorEmail ?: "")
            put("commitTime", commitTime)
            put("filesChanged", filesChanged)
            put("linesAdded", linesAdded)
            put("linesDeleted", linesDeleted)
        }

        try {
            val uri = URI.create("http://localhost:${BrowsingTrackerServer.port}/api/commits")
            val connection = uri.toURL().openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true

            connection.outputStream.use { os ->
                os.write(json.toString().toByteArray())
            }

            val responseCode = connection.responseCode
            if (responseCode == 201) {
                println("✅ Commit recorded successfully")
            } else {
                logger.warn("Failed to record commit, response code: $responseCode")
            }
        } catch (e: Exception) {
            logger.warn("Failed to send commit to API", e)
        }
    }
}
