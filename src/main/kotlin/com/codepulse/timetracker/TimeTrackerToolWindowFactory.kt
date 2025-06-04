package com.codepulse.timetracker

import com.codepulse.timetracker.license.LicenseDialog
import com.codepulse.timetracker.license.LicenseStateService
import com.codepulse.timetracker.license.LicenseValidator
import com.codepulse.timetracker.settings.TimeTrackerSettingsConfigurable
import com.codepulse.timetracker.settings.TimeTrackerSettings
import com.intellij.icons.AllIcons
import com.intellij.ide.BrowserUtil
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.JBColor
import com.intellij.ui.components.JBLabel
import com.intellij.ui.content.ContentFactory
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import java.awt.*
import javax.swing.*

class BackgroundImagePanel(private val backgroundImage: Image) : JPanel() {
    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2d = g.create() as Graphics2D
        g2d.drawImage(backgroundImage, 0, 0, width, height, this)
        g2d.dispose()
    }
}

class TimeTrackerToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val dashboardUrl = System.getProperty("dashboardUrl")
            ?: System.getenv("DASHBOARD_URL")
            ?: "http://localhost:${TimeTrackerSettings.getInstance().state.dashboardPort}"
        BrowserUtil.browse(dashboardUrl)

        toolWindow.hide(null)
    }
}
