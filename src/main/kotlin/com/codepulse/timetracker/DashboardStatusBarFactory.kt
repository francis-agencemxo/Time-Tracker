package com.codepulse.timetracker

import com.codepulse.timetracker.settings.TimeTrackerSettings
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.wm.CustomStatusBarWidget
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.openapi.wm.StatusBarWidget.WidgetPresentation
import com.intellij.openapi.wm.StatusBarWidget.MultipleTextValuesPresentation
import com.intellij.util.Consumer
import java.awt.BorderLayout
import java.awt.Component
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.Icon
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

/**
 * Factory that creates our Dashboard icon in the Status Bar.
 * Note: plugin.xml must register <statusBarWidgetFactory implementation="com.mxo.timetracker.DashboardStatusBarFactory"/>
 */
class DashboardStatusBarFactory : StatusBarWidgetFactory {
    override fun getId(): String = "CodePulse.DashboardWidget"
    override fun getDisplayName(): String = "CodePulse Dashboard"
    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget {
        return DashboardStatusBarWidget()
    }

    override fun disposeWidget(widget: StatusBarWidget) {
        widget.dispose()
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
}

class DashboardStatusBarWidget : CustomStatusBarWidget, Disposable {
    private var statusBar: StatusBar? = null
    private val panel = JPanel(BorderLayout())
    private val label: JLabel

    init {
        // 1) Load your 16×16 or 18×18 icon from resources:
        //    Place toolbar-icon.png under src/main/resources/icons/toolbar-icon.png
        val icon: Icon = IconLoader.getIcon("/icons/toolbar-icon.png", this::class.java)

        // 2) Create a JLabel with icon and text side by side:
        label = JLabel("CodePulse", icon, SwingConstants.LEFT).apply {
            toolTipText = "Open CodePulse Dashboard"
            // Add some padding so it doesn't look cramped:
            border = javax.swing.BorderFactory.createEmptyBorder(0, 4, 0, 4)

            // 3) Add mouse listener for click:
            addMouseListener(object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    val dashboardUrl = System.getProperty("dashboardUrl")
                        ?: System.getenv("DASHBOARD_URL")
                        ?: "http://localhost:${TimeTrackerSettings.getInstance().state.dashboardPort}"

                    BrowserUtil.browse(dashboardUrl)
                }
                override fun mouseEntered(e: MouseEvent) {
                    // Optionally change cursor to hand:
                    cursor = java.awt.Cursor.getPredefinedCursor(java.awt.Cursor.HAND_CURSOR)
                }
                override fun mouseExited(e: MouseEvent) {
                    cursor = java.awt.Cursor.getDefaultCursor()
                }
            })
        }

        // 4) Put the label inside a transparent panel (so background matches status bar):
        panel.isOpaque = false
        panel.add(label, BorderLayout.CENTER)
    }

    // Returns a unique ID for this widget
    override fun ID(): String = "CodePulse.DashboardWidget"

    // Called when IntelliJ actually adds us to the StatusBar
    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
    }

    // Called when IntelliJ removes us
    override fun dispose() {
        statusBar = null
        panel.removeAll()
    }

    // Provide our Swing component to IntelliJ
    override fun getComponent() = panel
}