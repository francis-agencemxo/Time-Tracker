package com.codepulse.timetracker.settings

import com.intellij.ide.ui.UINumericRange
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.ProjectManager
import com.codepulse.timetracker.settings.TimeTrackerSettings
import com.intellij.ui.JBIntSpinner
import com.intellij.ui.components.*
import java.awt.BorderLayout
import java.awt.FlowLayout
import java.io.File
import java.sql.Connection
import org.sqlite.SQLiteDataSource
import javax.swing.*

class TimeTrackerSettingsConfigurable : Configurable {
    private val dbFile = File(System.getProperty("user.home"), ".cache/phpstorm-time-tracker/data.db")
    private val conn: Connection by lazy {
        dbFile.parentFile.mkdirs()
        val ds = SQLiteDataSource().apply {
            url = "jdbc:sqlite:${dbFile.absolutePath}"
        }
        ds.connection
    }

    // in-memory map of project → list of URLs
    private val urlMap = mutableMapOf<String, MutableList<String>>()

    // UI models
    private val projectListModel = DefaultListModel<String>()
    private lateinit var projectList: JBList<String>
    private val urlListModel = DefaultListModel<String>()
    private lateinit var urlList: JBList<String>

    override fun getDisplayName(): String = "CodePulse Time Tracker URLs"

    override fun createComponent(): JComponent {
        // Load keystroke timeout setting
        val state = TimeTrackerSettings.getInstance().state

        val serverPortSpinner = JBIntSpinner(
            UINumericRange(
                state.trackerServerPort,
                1,
                65535,
            )
        ).apply {
            addChangeListener { state.trackerServerPort = value as Int }
            toolTipText = "Port number for the Tracker HTTP API server"
        }
        val dashboardPortSpinner = JBIntSpinner(
            UINumericRange(
                state.dashboardPort,
                1,
                65535,
            )
        ).apply {
            addChangeListener { state.dashboardPort = value as Int }
            toolTipText = "Port number for the Next.js dashboard dev server"
        }
        // Prepare top settings panel
        val generalPanel = JPanel(FlowLayout(FlowLayout.LEFT)).apply {
            add(JBLabel("Tracker server port:"))
            add(serverPortSpinner)
            add(JBLabel("Dashboard port:"))
            add(dashboardPortSpinner)
        }

        // load existing DB entries into memory
        loadAllUrls()
        // merge in all currently open projects (even those with no URLs yet)
        val openProjects = ProjectManager.getInstance().openProjects.mapNotNull { it.name }
        openProjects.forEach { urlMap.putIfAbsent(it, mutableListOf()) }

        // build main UI
        val outer = JBPanel<JBPanel<*>>(BorderLayout())
        outer.add(generalPanel, BorderLayout.NORTH)

        val splitPane = JSplitPane(JSplitPane.HORIZONTAL_SPLIT)
        splitPane.resizeWeight = 0.3

        // Left: projects
        projectList = JBList(projectListModel).apply {
            selectionMode = ListSelectionModel.SINGLE_SELECTION
            addListSelectionListener { onProjectSelected() }
        }
        splitPane.leftComponent = JBScrollPane(projectList)

        // Right: URL CRUD
        val urlPanel = JPanel(BorderLayout(5, 5))
        urlList = JBList(urlListModel).apply { selectionMode = ListSelectionModel.SINGLE_SELECTION }
        urlPanel.add(JBScrollPane(urlList), BorderLayout.CENTER)

        val controlPanel = JPanel(FlowLayout(FlowLayout.LEFT)).apply {
            val urlField = JBTextField(30)
            val addButton = JButton("➕ Add").apply {
                addActionListener {
                    val project = projectList.selectedValue ?: return@addActionListener
                    val url = urlField.text.trim()
                    if (url.isNotEmpty() && urlMap.getOrPut(project) { mutableListOf() }.none { it == url }) {
                        conn.prepareStatement("INSERT OR IGNORE INTO urls(project, url) VALUES(?, ?)").use { ps ->
                            ps.setString(1, project)
                            ps.setString(2, url)
                            ps.executeUpdate()
                        }
                        urlMap[project]!!.add(url)
                        urlListModel.addElement(url)
                        urlField.text = ""
                    }
                }
            }
            val removeButton = JButton("❌ Remove").apply {
                addActionListener {
                    val project = projectList.selectedValue ?: return@addActionListener
                    val sel = urlList.selectedValue ?: return@addActionListener
                    conn.prepareStatement("DELETE FROM urls WHERE project = ? AND url = ?").use { ps ->
                        ps.setString(1, project)
                        ps.setString(2, sel)
                        ps.executeUpdate()
                    }
                    urlMap[project]!!.remove(sel)
                    urlListModel.removeElement(sel)
                }
            }
            add(urlField)
            add(addButton)
            add(removeButton)
        }
        urlPanel.add(controlPanel, BorderLayout.SOUTH)

        splitPane.rightComponent = urlPanel
        outer.add(splitPane, BorderLayout.CENTER)

        // populate project list
        projectListModel.clear()
        urlMap.keys.sorted().forEach { projectListModel.addElement(it) }
        if (!projectListModel.isEmpty()) {
            projectList.selectedIndex = 0
        }

        return outer
    }

    override fun isModified(): Boolean = false // live updates via change listener

    override fun apply() {
        // no-op: URL changes persisted immediately, timeout stored via spinner listener
    }

    override fun reset() {
        // re-sync UI from DB and open projects, spinner reflects stored state
        resetList()
    }

    override fun disposeUIResources() {
        conn.close()
    }

    private fun loadAllUrls() {
        conn.prepareStatement("SELECT project, url FROM urls ORDER BY project DESC").use { ps ->
            ps.executeQuery().use { rs ->
                while (rs.next()) {
                    val proj = rs.getString("project")
                    val url = rs.getString("url")
                    urlMap.getOrPut(proj) { mutableListOf() }.add(url)
                }
            }
        }
    }

    private fun resetList() {
        urlMap.clear()
        loadAllUrls()
        ProjectManager.getInstance().openProjects.mapNotNull { it.name }.forEach { urlMap.putIfAbsent(it, mutableListOf()) }
        projectListModel.clear()
        urlMap.keys.sorted().forEach { projectListModel.addElement(it) }
        if (!projectListModel.isEmpty()) {
            projectList.selectedIndex = 0
        }
    }

    private fun onProjectSelected() {
        urlListModel.clear()
        projectList.selectedValue?.let { urlMap[it]?.forEach(urlListModel::addElement) }
    }
}
