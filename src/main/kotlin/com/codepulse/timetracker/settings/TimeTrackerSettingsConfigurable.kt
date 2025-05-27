package com.codepulse.timetracker.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.ProjectManager
import com.intellij.ui.components.*
import org.json.JSONObject
import java.awt.BorderLayout
import java.awt.FlowLayout
import java.io.File
import java.sql.Connection
import java.sql.DriverManager
import javax.swing.*

class TimeTrackerSettingsConfigurable : Configurable {
    private val dbFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.db")
    private val conn: Connection = DriverManager.getConnection("jdbc:sqlite:${dbFile.absolutePath}")

    // in-memory map of project → list of URLs
    private val urlMap = mutableMapOf<String, MutableList<String>>()

    // UI models
    private val projectListModel = DefaultListModel<String>()
    private lateinit var projectList: JBList<String>
    private val urlListModel = DefaultListModel<String>()
    private lateinit var urlList: JBList<String>

    override fun getDisplayName(): String = "CodePulse Time Tracker URLs"

    override fun createComponent(): JComponent {
        // load existing DB entries into memory
        loadAllUrls()
        // merge in all currently open projects (even those with no URLs yet)
        val openProjects = ProjectManager.getInstance().openProjects.mapNotNull { it.name }
        for (proj in openProjects) {
            urlMap.putIfAbsent(proj, mutableListOf())
        }

        // build UI
        val outer = JBPanel<JBPanel<*>>(BorderLayout())
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

        val controlPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        val urlField = JBTextField(30)
        val addButton = JButton("➕ Add").apply {
            addActionListener {
                val project = projectList.selectedValue ?: return@addActionListener
                val url = urlField.text.trim()
                if (url.isNotEmpty() && urlMap.getOrPut(project) { mutableListOf() }.none { it == url }) {
                    // insert DB record
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
        controlPanel.add(urlField)
        controlPanel.add(addButton)
        controlPanel.add(removeButton)
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

    override fun isModified(): Boolean = false // live updates applied immediately

    override fun apply() {
        // nothing: changes are persisted on the fly
    }

    override fun reset() {
        // re-sync with DB and open projects
        urlMap.clear()
        loadAllUrls()
        val openProjects = ProjectManager.getInstance().openProjects.mapNotNull { it.name }
        for (proj in openProjects) urlMap.putIfAbsent(proj, mutableListOf())
        projectListModel.clear()
        urlMap.keys.sorted().forEach { projectListModel.addElement(it) }
        if (!projectListModel.isEmpty()) {
            projectList.selectedIndex = 0
        }
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

    private fun onProjectSelected() {
        urlListModel.clear()
        projectList.selectedValue?.let { proj ->
            urlMap[proj]?.forEach { urlListModel.addElement(it) }
        }
    }
}
