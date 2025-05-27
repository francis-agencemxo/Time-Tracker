package com.codepulse.timetracker

import com.codepulse.timetracker.settings.TimeTrackerSettingsConfigurable
import com.intellij.icons.AllIcons
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
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
            val port = BrowsingTrackerServer.port
            addActionListener {
                BrowserUtil.browse("http://localhost:$port")
            }
        }

// then your button bar looks like:
        val buttonBar = JPanel(FlowLayout(FlowLayout.RIGHT)).apply {
            border = JBUI.Borders.empty(5, 10)
            preferredSize = Dimension(400, 200)
            add(openSettingsBtn)
            add(viewDashboardBtn)
        }

        topPanel.add(buttonBar)

        panel.add(topPanel, BorderLayout.NORTH)

        // 4) …and if you have a JCEF browser or other center‐pane UI, add it here:
        //    panel.add(myNextJsBrowser.component, BorderLayout.CENTER)
    }
}
