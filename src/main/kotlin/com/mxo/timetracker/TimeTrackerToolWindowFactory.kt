package com.mxo.timetracker

import javax.swing.BorderFactory
import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.ActionUpdateThreadAware
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.actionSystem.ToggleAction
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.JBColor
import com.intellij.ui.components.*
import com.intellij.ui.content.ContentFactory
import org.json.JSONArray
import org.json.JSONObject
import com.intellij.util.ui.UIUtil
import javax.swing.table.DefaultTableModel
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
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
    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT // Or BGT if it can be background
    }
}

class EditUrlsAction(
    private val getSelectedProject: () -> String?,
    private val openEditor: (String) -> Unit
) : AnAction("Edit Project URLs", "Edit URLs for selected project", AllIcons.General.Web), ActionUpdateThreadAware {

    override fun actionPerformed(e: AnActionEvent) {
        val projectName = getSelectedProject()
        if (projectName != null) {
            // Fix for modal access violations
            com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                openEditor(projectName)
            }
        } else {
            Messages.showInfoMessage("Please select a project to edit its URLs.", "No Project Selected")
        }
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}

class TimeTrackerToolWindowFactory : ToolWindowFactory {
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val panel = JPanel(BorderLayout(10, 10))
        val contentFactory = ContentFactory.getInstance()
        val content = contentFactory.createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)

        val initialLoadLength = 7
        val projectName = project.name
        val todayStr = LocalDate.now().toString()

        //val dateField = JBTextField(todayStr)
        //val loadButton = JButton("Afficher")
        val resetButton = JButton("🔄 Reset")
        val title = JLabel("🔄 TITLE")
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

        tree.cellRenderer = object : DefaultTreeCellRenderer() {
            override fun getTreeCellRendererComponent(
                tree: JTree?,
                value: Any?,
                selected: Boolean,
                expanded: Boolean,
                leaf: Boolean,
                row: Int,
                hasFocus: Boolean
            ): Component {
                super.getTreeCellRendererComponent(tree, value, selected, expanded, leaf, row, hasFocus)

                if (value is DefaultMutableTreeNode) {
                    val userObj = value.userObject
                    if (userObj is Pair<*, *>) {
                        val name = userObj.first as? String ?: ""
                        val label = "$name (${userObj.second})"
                        text = label

                        icon = when {
                            name.contains("/") || name.contains(".") -> {
                                val fileName = name.substringAfterLast("/")
                                val fileType = com.intellij.openapi.fileTypes.FileTypeManager.getInstance()
                                    .getFileTypeByFileName(fileName)
                                fileType.icon ?: AllIcons.FileTypes.Any_type
                            }
                            name.matches(Regex("""\d{4}-\d{2}-\d{2}""")) -> {
                                AllIcons.General.Layout
                            }
                            else -> {
                                AllIcons.Nodes.Module
                            }
                        }
                    }
                }

                // ✅ Force transparent background after super + content logic
                background = null
                isOpaque = false

                return this
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
            // Step 1: Save expanded paths
            val expandedPaths = mutableListOf<TreePath>()
            for (i in 0 until tree.rowCount) {
                val path = tree.getPathForRow(i)
                if (path != null && tree.isExpanded(path)) {
                    expandedPaths.add(path)
                }
            }

            // Clear and rebuild root
            root.removeAllChildren()
            val hiddenProjects = getHiddenProjects()
            val hiddenNode = DefaultMutableTreeNode("Cachés")

            var weeklyTotalSeconds = 0
            val projectDayMap = mutableMapOf<String, MutableMap<String, Int>>() // already exists
            val expandedProjects = mutableSetOf<String>() // store which projects are expanded
            for (i in 0 until tree.rowCount) {
                val path = tree.getPathForRow(i)
                val node = path?.lastPathComponent as? DefaultMutableTreeNode ?: continue
                val userObj = node.userObject
                if (userObj is Pair<*, *> && userObj.first is String && path.pathCount == 2) {
                    expandedProjects.add(userObj.first as String)
                }
            }

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

                    val showAll = expandedProjects.contains(key)
                    val sortedDays = dailyMap.entries.sortedByDescending { it.key }
                    val daysToShow = if (showAll) sortedDays else sortedDays.take(initialLoadLength)

                    for ((day, sec) in daysToShow) {
                        val dh = sec / 3600
                        val dm = (sec % 3600) / 60
                        val dFormatted = if (dh > 0) "${dh}h${dm}m" else "${dm}m"
                        val dayNode = DefaultMutableTreeNode(Pair(day, dFormatted))

                        val projectObj = json.optJSONObject(day)?.optJSONObject(key)
                        val filesObj = projectObj?.optJSONObject("files")
                        if (filesObj != null) {
                            for (fileKey in filesObj.keySet()) {
                                val fileTimeSec = filesObj.optInt(fileKey, 0)
                                if (fileTimeSec > 0) {
                                    val fh = fileTimeSec / 3600
                                    val fm = (fileTimeSec % 3600) / 60
                                    val fileFormatted = if (fh > 0) "${fh}h${fm}m" else "${fm}m"
                                    dayNode.add(DefaultMutableTreeNode(Pair(fileKey, fileFormatted)))
                                }
                            }
                        }

                        projectNode.add(dayNode)
                    }

                    if (!showAll && sortedDays.size > initialLoadLength) {
                        val loadMoreNode = DefaultMutableTreeNode("🡇 Load more...")
                        projectNode.add(loadMoreNode)
                    }

                    if (key in hiddenProjects) hiddenNode.add(projectNode) else root.add(projectNode)
                }
            }

            val totalH = weeklyTotalSeconds / 3600
            val totalM = (weeklyTotalSeconds % 3600) / 60
            weeklyTotalLabel.text = "Total cette semaine : ${if (totalH > 0) "${totalH}h${totalM}m" else "${totalM}m"}"

            if (showHidden) root.add(hiddenNode)
            treeModel.reload()

            // Step 2: Restore expanded paths
            for (i in 0 until tree.rowCount) {
                val path = tree.getPathForRow(i)
                val node = path?.lastPathComponent as? DefaultMutableTreeNode ?: continue
                val userObj = node.userObject
                if (userObj is Pair<*, *> && expandedProjects.contains(userObj.first)) {
                    tree.expandPath(path)
                }
            }

            tree.addMouseListener(object : MouseAdapter() {
                override fun mouseClicked(e: MouseEvent) {
                    val selPath = tree.getPathForLocation(e.x, e.y) ?: return
                    val node = selPath.lastPathComponent as? DefaultMutableTreeNode ?: return
                    val label = node.userObject as? String ?: return
                    if (label == "🡇 Load more...") {
                        val parent = node.parent as? DefaultMutableTreeNode ?: return
                        val projectLabel = (parent.userObject as? Pair<*, *>)?.first as? String ?: return

                        expandedProjects.add(projectLabel)
                        updateSummary()
                        tree.expandPath(TreePath(parent.path))
                    }
                }
            })
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

        fun openUrlCrudEditorForProject(projectName: String) {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            val configNode = json.optJSONObject("config") ?: JSONObject()
            val projectConfig = configNode.optJSONObject(projectName) ?: JSONObject()
            val urls = projectConfig.optJSONArray("urls") ?: JSONArray()

            // Create dialog
            val dialog = JDialog(null as Frame?, "Modifier les URLs", true)
            dialog.layout = BorderLayout(10, 10)

            val listModel = DefaultListModel<String>()
            for (i in 0 until urls.length()) {
                listModel.addElement(urls.getString(i))
            }

            val urlList = JBList(listModel)
            urlList.cellRenderer = object : DefaultListCellRenderer() {
                override fun getListCellRendererComponent(
                    list: JList<*>,
                    value: Any?,
                    index: Int,
                    isSelected: Boolean,
                    cellHasFocus: Boolean
                ): Component {
                    val comp = super.getListCellRendererComponent(list, value, index, isSelected, cellHasFocus)
                    if (comp is JLabel) {
                        comp.border = BorderFactory.createEmptyBorder(0, 10, 0, 0) // top, left, bottom, right
                    }
                    return comp
                }
            }

            val scrollPane = JBScrollPane(urlList)

            val inputField = JTextField()
            val addButton = JButton("➕ Ajouter")
            val removeButton = JButton("❌ Supprimer")
            val saveButton = JButton("💾 Enregistrer")
            val cancelButton = JButton("Annuler")

            addButton.addActionListener {
                val newUrl = inputField.text.trim()
                if (newUrl.isNotEmpty() && !listModel.contains(newUrl)) {
                    listModel.addElement(newUrl)
                    inputField.text = ""
                }
            }

            removeButton.addActionListener {
                val selected = urlList.selectedValue
                if (selected != null) {
                    listModel.removeElement(selected)
                }
            }

            val buttonRow = JPanel(FlowLayout(FlowLayout.RIGHT))
            buttonRow.add(addButton)
            buttonRow.add(removeButton)

            val footerRow = JPanel(FlowLayout(FlowLayout.RIGHT))
            footerRow.add(cancelButton)
            footerRow.add(saveButton)

            val inputRow = JPanel(BorderLayout(5, 5))
            inputRow.add(inputField, BorderLayout.CENTER)
            inputRow.add(addButton, BorderLayout.EAST)

            val centerPanel = JPanel(BorderLayout(5, 5))
            centerPanel.add(scrollPane, BorderLayout.CENTER)
            centerPanel.add(buttonRow, BorderLayout.SOUTH)

            val contentPanel = JPanel(BorderLayout(10, 10))
            contentPanel.border = BorderFactory.createEmptyBorder(15, 15, 15, 15) // top, left, bottom, right

            contentPanel.add(inputRow, BorderLayout.NORTH)
            contentPanel.add(centerPanel, BorderLayout.CENTER)
            contentPanel.add(footerRow, BorderLayout.SOUTH)

            dialog.contentPane = contentPanel

            saveButton.addActionListener {
                val newArray = JSONArray()
                for (i in 0 until listModel.size()) {
                    newArray.put(listModel.get(i))
                }

                projectConfig.put("urls", newArray)
                configNode.put(projectName, projectConfig)
                json.put("config", configNode)
                dataFile.writeText(json.toString(2))
                dialog.dispose()
                //refreshTime(dateField.text.trim())
            }

            cancelButton.addActionListener {
                dialog.dispose()
            }

            dialog.setSize(400, 300)
            dialog.setLocationRelativeTo(null)
            dialog.isVisible = true
        }

        val editUrlsAction = EditUrlsAction(
            getSelectedProject = {
                val node = tree.selectionPath?.lastPathComponent as? DefaultMutableTreeNode
                val userObj = node?.userObject
                if (userObj is Pair<*, *> && node.level == 1) userObj.first as? String else null
            },
            openEditor = { projectName ->
                ApplicationManager.getApplication().invokeLater {
                    openUrlCrudEditorForProject(projectName)
                }
            }
        )

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
            add(editUrlsAction)
        }
        val actionToolbar = ActionManager.getInstance().createActionToolbar("MXO.TimeTracker.Toolbar", actionGroup, true)
        actionToolbar.setTargetComponent(tree)

        val toolbarPanel = JPanel(BorderLayout()).apply {

            add(actionToolbar.component, BorderLayout.EAST)
        }

        val topPanel = JPanel()
        topPanel.layout = BoxLayout(topPanel, BoxLayout.Y_AXIS)
        topPanel.add(toolbarPanel)

        val logoIcon = ImageIcon(javaClass.getResource("/icons/logo-mxo.png")) // Use PNG or supported format
        val logoWrapper = JPanel(FlowLayout(FlowLayout.CENTER, 0, 0)).apply {
            border = BorderFactory.createEmptyBorder(10, 10, 30, 10) // top, left, bottom, right
            add(JLabel(logoIcon))
        }
        topPanel.add(logoWrapper)

        //topPanel.add(JBLabel("Project: $projectName"), BorderLayout.WEST)
        topPanel.add(weeklyTotalLabel, BorderLayout.WEST)
        //topPanel.add(JBLabel("Enter date (YYYY-MM-DD):"))
//        val dateRow = JPanel(BorderLayout())
//        dateRow.add(dateField, BorderLayout.WEST)
//        val buttons = JPanel(FlowLayout(FlowLayout.RIGHT)).apply {
//            add(loadButton)
//            add(resetButton)
//        }
//        dateRow.add(buttons, BorderLayout.EAST)

        //topPanel.add(dateRow)
        topPanel.add(durationLabel)

        val bottomPanel = JPanel(BorderLayout())
        bottomPanel.add(urlFooterLabel, BorderLayout.CENTER)

        fun showProjectUrlsInFooter(projectName: String) {
            val urls = getProjectUrls(projectName)
            val html = buildString {
                append("<html><i>URLs:</i><br>")
                for (i in 0 until urls.length()) {
                    append(urls.getString(i)).append("<br>")
                }
                append("</html>")
            }
            urlFooterLabel.text = html
        }

        tree.addTreeSelectionListener { event ->
            val selectedNode = event.path?.lastPathComponent as? DefaultMutableTreeNode ?: return@addTreeSelectionListener
            val userObj = selectedNode.userObject
            val projectName = when (userObj) {
                is Pair<*, *> -> userObj.first as? String
                else -> null
            }

            if (projectName != null && selectedNode.level == 1) { // project node level
                showProjectUrlsInFooter(projectName)
            } else {
                urlFooterLabel.text = "" // clear when not on a project
            }
        }

        //bottomPanel.add(editUrlsButton, BorderLayout.EAST)

        panel.add(topPanel, BorderLayout.NORTH)
        panel.add(treeScrollPane, BorderLayout.CENTER)
        panel.add(bottomPanel, BorderLayout.SOUTH)
        println("REFRESH")
        refreshTime(todayStr)
        updateSummary()

        val refreshTimer = Timer(60_000) {
            updateSummary()
        }
        refreshTimer.start()
    }
}
