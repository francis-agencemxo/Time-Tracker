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

        // 1) Root panel
        val panel = JPanel(BorderLayout(10, 10))
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)

        // 2) Top panel holds logo, buttons, and stats
        val topPanel = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
        }

        // — logo with background
        val bgImage = ImageIcon(javaClass.getResource("/icons/background-mxo.png")).image
        val logoIcon = ImageIcon(javaClass.getResource("/icons/logo-mxo.png"))
        val logoWithBg = BackgroundImagePanel(bgImage).apply {
            layout = GridBagLayout()
            border = BorderFactory.createEmptyBorder(10, 10, 0, 10)
            preferredSize = Dimension(400, 150)
            add(JLabel(logoIcon))
        }
        topPanel.add(logoWithBg)

        val activateButton = JButton("🔑 Activate").apply {
            toolTipText = "Enter license information"
            addActionListener {
                val dialog = LicenseDialog(project)
                if (dialog.showAndGet()) {
                    val email = dialog.getEmail()
                    val key = dialog.getLicenseKey()
                    val licenseState = LicenseStateService.getInstance().state

                    if (LicenseValidator.validate(email, key)) {
                        licenseState.email = email
                        licenseState.licenseKey = key
                        licenseState.isValid = true

                        NotificationGroupManager
                            .getInstance()
                            .getNotificationGroup("CodePulse")
                            .createNotification(
                                "License activated successfully!",      // NO leading emoji/icon
                                NotificationType.INFORMATION
                            )
                            .notify(project)
                    } else {
                        JOptionPane.showMessageDialog(null, "❌ Invalid license key or email.")
                    }
                }
            }
        }

        val openSettingsBtn = JButton(AllIcons.General.Settings).apply {
            text = "Settings"
            toolTipText = "Open plugin settings"
            isFocusPainted = false
            margin = JBUI.insets(4, 12)
            UIUtil.applyStyle(UIUtil.ComponentStyle.SMALL, this)
            addActionListener {
                ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, TimeTrackerSettingsConfigurable::class.java)
            }
        }

        val viewDashboardBtn = JButton(AllIcons.General.Web).apply {
            text = "Dashboard"
            toolTipText = "Open web dashboard"
            isFocusPainted = false
            margin = JBUI.insets(4, 12)
            UIUtil.applyStyle(UIUtil.ComponentStyle.SMALL, this)
            val dashboardUrl = System.getProperty("dashboardUrl")
                ?: System.getenv("DASHBOARD_URL")
                ?: "http://localhost:${TimeTrackerSettings.getInstance().state.dashboardPort}"
            addActionListener {
                BrowserUtil.browse(dashboardUrl)
            }
        }

// then your button bar looks like:
        val buttonBar = JPanel(FlowLayout(FlowLayout.RIGHT)).apply {
            border = JBUI.Borders.empty(5, 10)
            preferredSize = Dimension(400, 200)

            if (!LicenseStateService.getInstance().state.isValid) {
                add(activateButton)
            }
            else{
                add(openSettingsBtn)
                add(viewDashboardBtn)
            }
        }

        topPanel.add(buttonBar)

        panel.add(topPanel, BorderLayout.NORTH)

        // 4) …and if you have a JCEF browser or other center‐pane UI, add it here:
        //    panel.add(myNextJsBrowser.component, BorderLayout.CENTER)
    }
}
