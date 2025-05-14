package com.mxo.timetracker

import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.actionSystem.ToggleAction
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
import javax.swing.tree.DefaultTreeCellRenderer
import javax.swing.tree.DefaultTreeModel
import javax.swing.tree.TreePath
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.*
import javax.swing.Timer

class ToggleHiddenProjectsAction(
    private val stateProvider: () -> Boolean,
    private val onToggle: (Boolean) -> Unit
) : ToggleAction("Show Hidden", "Toggle hidden projects visibility", AllIcons.Actions.Show) {
    override fun isSelected(e: AnActionEvent): Boolean = stateProvider()
    override fun setSelected(e: AnActionEvent, state: Boolean) = onToggle(state)
}

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
        val weeklyTotalLabel = JBLabel()

        val root = DefaultMutableTreeNode("Projets")
        val treeModel = DefaultTreeModel(root)
        val tree = JTree(treeModel)
        tree.isRootVisible = false
        val treeScrollPane = JBScrollPane(tree)

        val config = if (dataFile.exists()) JSONObject(dataFile.readText()).optJSONObject("config") ?: JSONObject() else JSONObject()
        val showHiddenInitially = config.optBoolean("showHidden", false)
        var showHidden = showHiddenInitially

        tree.cellRenderer = object : DefaultTreeCellRenderer() {
            override fun getTreeCellRendererComponent(tree: JTree?, value: Any?, selected: Boolean, expanded: Boolean, leaf: Boolean, row: Int, hasFocus: Boolean): Component {
                val comp = super.getTreeCellRendererComponent(tree, value, selected, expanded, leaf, row, hasFocus)
                if (value is DefaultMutableTreeNode) {
                    val userObj = value.userObject
                    if (userObj is Pair<*, *>) {
                        text = "${userObj.first} (${userObj.second})"
                    }
                }
                return comp
            }
        }

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
            val projectDayMap = mutableMapOf<String, MutableMap<String, Int>>()

            if (dataFile.exists()) {
                val json = JSONObject(dataFile.readText())
                val today = LocalDate.now()
                val weekFields = WeekFields.of(Locale.getDefault())
                val currentWeek = today.get(weekFields.weekOfWeekBasedYear())

                for (dateKey in json.keySet()) {
                    if (dateKey == "config") continue
                    val parsedDate = try { LocalDate.parse(dateKey, DateTimeFormatter.ISO_DATE) } catch (_: Exception) { continue }
                    if (parsedDate.get(weekFields.weekOfWeekBasedYear()) == currentWeek && parsedDate.year == today.year) {
                        val dayData = json.optJSONObject(dateKey) ?: continue
                        for (key in dayData.keySet()) {
                            val duration = dayData.getJSONObject(key).optInt("duration", 0)
                            weeklyTotalSeconds += duration
                            projectDayMap.computeIfAbsent(key) { mutableMapOf() }
                            projectDayMap[key]!![dateKey] = projectDayMap[key]!!.getOrDefault(dateKey, 0) + duration
                        }
                    }
                }

                val sortedProjects = projectDayMap.entries.sortedByDescending { it.value.values.maxOrNull() ?: 0 }

                for ((key, dailyMap) in sortedProjects) {
                    val duration = dailyMap.values.sum()
                    val hours = duration / 3600
                    val minutes = (duration % 3600) / 60
                    val formatted = if (hours > 0) "${hours}h${minutes}m" else "${minutes}m"
                    val projectNode = DefaultMutableTreeNode(Pair(key, formatted))

                    for ((day, sec) in dailyMap.entries.sortedBy { it.key }) {
                        val dh = sec / 3600
                        val dm = (sec % 3600) / 60
                        val dFormatted = if (dh > 0) "${dh}h${dm}m" else "${dm}m"
                        projectNode.add(DefaultMutableTreeNode(Pair(day, dFormatted)))
                    }

                    if (key in hiddenProjects) hiddenNode.add(projectNode) else root.add(projectNode)
                }
            }

            val totalH = weeklyTotalSeconds / 3600
            val totalM = (weeklyTotalSeconds % 3600) / 60
            weeklyTotalLabel.text = "Total cette semaine : ${if (totalH > 0) "${totalH}h${totalM}m" else "${totalM}m"}"

            if (showHidden) root.add(hiddenNode)
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

        val actionGroup = DefaultActionGroup().apply {
            add(ToggleHiddenProjectsAction(
                stateProvider = { showHidden },
                onToggle = {
                    showHidden = it
                    val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
                    val configNode = json.optJSONObject("config") ?: JSONObject()
                    configNode.put("showHidden", it)
                    json.put("config", configNode)
                    dataFile.writeText(json.toString(2))
                    updateSummary()
                }
            ))
        }
        val actionToolbar = ActionManager.getInstance().createActionToolbar("MXO.TimeTracker.Toolbar", actionGroup, true)

        val toolbarPanel = JPanel(BorderLayout()).apply {

            add(actionToolbar.component, BorderLayout.EAST)
        }

        val topPanel = JPanel()
        topPanel.layout = BoxLayout(topPanel, BoxLayout.Y_AXIS)
        topPanel.add(toolbarPanel)
        //topPanel.add(JBLabel("Project: $projectName"), BorderLayout.WEST)
        topPanel.add(weeklyTotalLabel, BorderLayout.WEST)
        topPanel.add(JBLabel("Enter date (YYYY-MM-DD):"))
        val dateRow = JPanel(BorderLayout())
        dateRow.add(dateField, BorderLayout.WEST)
        val buttons = JPanel(FlowLayout(FlowLayout.RIGHT)).apply {
            add(loadButton)
            add(resetButton)
        }
        dateRow.add(buttons, BorderLayout.EAST)
        topPanel.add(dateRow)
        topPanel.add(durationLabel)

        val bottomPanel = JPanel(BorderLayout())
        bottomPanel.add(urlFooterLabel, BorderLayout.CENTER)
        bottomPanel.add(editUrlsButton, BorderLayout.EAST)

        panel.add(topPanel, BorderLayout.NORTH)
        panel.add(treeScrollPane, BorderLayout.CENTER)
        panel.add(bottomPanel, BorderLayout.SOUTH)

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

        refreshTime(todayStr)
        updateSummary()
    }
}
