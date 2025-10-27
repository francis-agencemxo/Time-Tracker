package com.codepulse.timetracker

import com.codepulse.timetracker.settings.TimeTrackerSettings
import com.intellij.icons.AllIcons
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.wm.CustomStatusBarWidget
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import java.awt.BorderLayout
import java.awt.Cursor
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.Icon
import javax.swing.BorderFactory
import javax.swing.JLabel
import javax.swing.JMenuItem
import javax.swing.JPanel
import javax.swing.JPopupMenu
import javax.swing.SwingConstants

/**
 * Factory that creates our Dashboard icon in the Status Bar.
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
    private var project: Project? = null
    private val panel = JPanel(BorderLayout())
    private val label: JLabel
    private val popupMenu: JPopupMenu
    private val settingsLabel: JLabel

    init {
        val icon: Icon = IconLoader.getIcon("/icons/toolbar-icon.png", this::class.java)

        label = JLabel("CodePulse", icon, SwingConstants.LEFT).apply {
            toolTipText = "Open CodePulse Dashboard"
            border = BorderFactory.createEmptyBorder(0, 4, 0, 4)

            addMouseListener(object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (!e.isPopupTrigger && e.button == MouseEvent.BUTTON1) {
                        openDashboard()
                    }
                }

                override fun mousePressed(e: MouseEvent) {
                    maybeShowPopup(e)
                }

                override fun mouseReleased(e: MouseEvent) {
                    maybeShowPopup(e)
                }

                override fun mouseEntered(e: MouseEvent) {
                    cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                }

                override fun mouseExited(e: MouseEvent) {
                    cursor = Cursor.getDefaultCursor()
                }
            })
        }

        popupMenu = JPopupMenu().apply {
            add(JMenuItem("Open Dashboard").apply {
                addActionListener { openDashboard() }
            })
            add(JMenuItem("Open Settings").apply {
                addActionListener { openSettings() }
            })
        }

        settingsLabel = JLabel(AllIcons.General.Settings).apply {
            toolTipText = "Open CodePulse Settings"
            border = BorderFactory.createEmptyBorder(0, 2, 0, 0)
            addMouseListener(object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    if (e.button == MouseEvent.BUTTON1) {
                        openSettings()
                    }
                }

                override fun mouseEntered(e: MouseEvent) {
                    cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
                }

                override fun mouseExited(e: MouseEvent) {
                    cursor = Cursor.getDefaultCursor()
                }
            })
        }

        panel.isOpaque = false
        panel.add(label, BorderLayout.CENTER)
        panel.add(settingsLabel, BorderLayout.EAST)
    }

    override fun ID(): String = "CodePulse.DashboardWidget"

    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
        this.project = statusBar.project
    }

    override fun dispose() {
        statusBar = null
        project = null
        panel.removeAll()
    }

    override fun getComponent() = panel

    private fun maybeShowPopup(e: MouseEvent) {
        if (e.isPopupTrigger) {
            popupMenu.show(e.component, e.x, e.y)
        }
    }

    private fun openDashboard() {
        val dashboardUrl = System.getProperty("dashboardUrl")
            ?: System.getenv("DASHBOARD_URL")
            ?: "http://localhost:${TimeTrackerSettings.getInstance().state.dashboardPort}"

        BrowserUtil.browse(dashboardUrl)
    }

    private fun openSettings() {
        val targetProject = project ?: return
        ShowSettingsUtil.getInstance().showSettingsDialog(targetProject, "CodePulse Time Tracker")
    }
}
