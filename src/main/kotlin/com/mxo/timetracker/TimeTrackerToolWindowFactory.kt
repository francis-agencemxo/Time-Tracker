package com.mxo.timetracker

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.*
import com.intellij.ui.content.ContentFactory
import org.json.JSONArray
import org.json.JSONObject
import java.awt.*
import java.io.File
import javax.swing.*
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeModel
import javax.swing.tree.TreePath
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.*
import javax.swing.Timer

class TimeTrackerToolWindowFactory : ToolWindowFactory {
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = JPanel(BorderLayout(10, 10))
        val contentFactory = ContentFactory.getInstance()
        val content = contentFactory.createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)

        val projectName = project.name
        val todayStr = LocalDate.now().toString()

        val dateField = JBTextField(todayStr)
        val loadButton = JButton("Afficher")
        val resetButton = JButton("🔄 Reset")
        val durationLabel = JBLabel()
        val urlFooterLabel = JBLabel()
        val editUrlsButton = JButton("✏️ Modifier URLs")
        val toggleHiddenButton = JToggleButton("👁️ Projets cachés")
        val weeklyTotalLabel = JBLabel()

        val root = DefaultMutableTreeNode("Projets")
        val treeModel = DefaultTreeModel(root)
        val tree = JTree(treeModel)
        tree.isRootVisible = false
        val treeScrollPane = JBScrollPane(tree)

        val config = if (dataFile.exists()) JSONObject(dataFile.readText()).optJSONObject("config") ?: JSONObject() else JSONObject()
        val showHiddenInitially = config.optBoolean("showHidden", false)
        toggleHiddenButton.isSelected = showHiddenInitially

        fun getHiddenProjects(): Set<String> {
            if (!dataFile.exists()) return emptySet()
            val json = JSONObject(dataFile.readText())
            val config = json.optJSONObject("config") ?: return emptySet()
            val hidden = config.optJSONArray("hiddenProjects") ?: return emptySet()
            return (0 until hidden.length()).map { hidden.getString(it) }.toSet()
        }

        fun saveHiddenProjects(hidden: Set<String>) {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            val config = json.optJSONObject("config") ?: JSONObject()
            config.put("hiddenProjects", JSONArray(hidden))
            json.put("config", config)
            dataFile.writeText(json.toString(2))
        }

        fun updateSummary() {
            root.removeAllChildren()
            val hiddenProjects = getHiddenProjects()
            val hiddenNode = DefaultMutableTreeNode("Cachés")

            var weeklyTotalSeconds = 0
            if (dataFile.exists()) {
                val json = JSONObject(dataFile.readText())
                val today = LocalDate.now()
                val weekFields = WeekFields.of(Locale.getDefault())
                val currentWeek = today.get(weekFields.weekOfWeekBasedYear())

                val weeklyProjectTotals = mutableMapOf<String, Int>()

                for (dateKey in json.keySet()) {
                    if (dateKey == "config") continue
                    val parsedDate = try { LocalDate.parse(dateKey, DateTimeFormatter.ISO_DATE) } catch (_: Exception) { continue }
                    if (parsedDate.get(weekFields.weekOfWeekBasedYear()) == currentWeek && parsedDate.year == today.year) {
                        val dayData = json.optJSONObject(dateKey) ?: continue
                        for (key in dayData.keySet()) {
                            val duration = dayData.getJSONObject(key).optInt("duration", 0)
                            weeklyProjectTotals[key] = weeklyProjectTotals.getOrDefault(key, 0) + duration
                        }
                    }
                }

                for ((key, duration) in weeklyProjectTotals.entries.sortedByDescending { it.value }) {
                    val hours = duration / 3600
                    val minutes = (duration % 3600) / 60
                    val formatted = if (hours > 0) "${hours}h${minutes}m" else "${minutes}m"
                    val node = DefaultMutableTreeNode(key)
                    node.userObject = Pair(key, formatted)
                    if (key in hiddenProjects) {
                        hiddenNode.add(node)
                    } else {
                        root.add(node)
                        weeklyTotalSeconds += duration
                    }
                }
            }

            val totalH = weeklyTotalSeconds / 3600
            val totalM = (weeklyTotalSeconds % 3600) / 60
            weeklyTotalLabel.text = "Total cette semaine : ${if (totalH > 0) "${totalH}h${totalM}m" else "${totalM}m"}"

            if (toggleHiddenButton.isSelected) {
                root.add(hiddenNode)
            }
            treeModel.reload()
        }

        tree.componentPopupMenu = JPopupMenu().apply {
            val hideItem = JMenuItem("Cacher")
            val unhideItem = JMenuItem("Afficher")
            add(hideItem)
            add(unhideItem)

            hideItem.addActionListener {
                val path = tree.selectionPath ?: return@addActionListener
                val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return@addActionListener
                val value = (node.userObject as? Pair<*, *>)?.first as? String ?: return@addActionListener
                val current = getHiddenProjects().toMutableSet()
                current.add(value)
                saveHiddenProjects(current)
                updateSummary()
            }

            unhideItem.addActionListener {
                val path = tree.selectionPath ?: return@addActionListener
                val node = path.lastPathComponent as? DefaultMutableTreeNode ?: return@addActionListener
                val value = (node.userObject as? Pair<*, *>)?.first as? String ?: return@addActionListener
                val current = getHiddenProjects().toMutableSet()
                current.remove(value)
                saveHiddenProjects(current)
                updateSummary()
            }
        }

        val topPanel = JPanel()
        topPanel.layout = BoxLayout(topPanel, BoxLayout.Y_AXIS)
        topPanel.add(JBLabel("Project: $projectName"))
        topPanel.add(JBLabel("Enter date (YYYY-MM-DD):"))
        val dateRow = JPanel(BorderLayout())
        dateRow.add(dateField, BorderLayout.CENTER)
        val buttons = JPanel(FlowLayout(FlowLayout.RIGHT)).apply {
            add(loadButton)
            add(resetButton)
        }
        dateRow.add(buttons, BorderLayout.EAST)
        topPanel.add(dateRow)
        topPanel.add(durationLabel)
        topPanel.add(weeklyTotalLabel)
        topPanel.add(toggleHiddenButton)

        val bottomPanel = JPanel(BorderLayout())
        bottomPanel.add(urlFooterLabel, BorderLayout.CENTER)
        bottomPanel.add(editUrlsButton, BorderLayout.EAST)

        toggleHiddenButton.addActionListener {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            val configNode = json.optJSONObject("config") ?: JSONObject()
            configNode.put("showHidden", toggleHiddenButton.isSelected)
            json.put("config", configNode)
            dataFile.writeText(json.toString(2))
            updateSummary()
        }

        fun getProjectData(date: String): JSONObject? {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            return json.optJSONObject(date)?.optJSONObject(projectName)
        }

        fun getProjectUrls(projectName: String): JSONArray {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            val config = json.optJSONObject("config")?.optJSONObject(projectName)
            return config?.optJSONArray("urls") ?: JSONArray()
        }

        fun refreshTime(date: String) {
            val projectData = getProjectData(date)
            val duration = projectData?.optInt("duration", 0)?.div(60) ?: 0
            durationLabel.text = "Time on $date: $duration min"

            val urls = getProjectUrls(projectName)
            val urlText = (0 until urls.length()).joinToString("<br>") { urls.getString(it) }
            urlFooterLabel.text = "<html><i>URLs:</i><br>$urlText</html>"
        }

        loadButton.addActionListener {
            val date = dateField.text.trim()
            refreshTime(date)
            updateSummary()
        }

        resetButton.addActionListener {
            dateField.text = todayStr
            refreshTime(todayStr)
            updateSummary()
        }

        panel.add(topPanel, BorderLayout.NORTH)
        panel.add(treeScrollPane, BorderLayout.CENTER)
        panel.add(bottomPanel, BorderLayout.SOUTH)

        refreshTime(todayStr)
        updateSummary()
    }
}
