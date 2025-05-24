package com.codepulse.timetracker

import com.codepulse.timetracker.settings.TimeTrackerSettings
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
import com.intellij.openapi.options.ShowSettingsUtil
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
import com.codepulse.timetracker.settings.TimeTrackerSettingsConfigurable
import com.intellij.openapi.fileTypes.FileTypeManager
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.io.File
import java.net.BindException
import java.net.InetSocketAddress
import java.net.Socket
import java.time.Duration
import javax.swing.*
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeCellRenderer
import javax.swing.tree.DefaultTreeModel
import javax.swing.tree.TreePath
import java.time.LocalDate
import java.time.LocalDateTime
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
            ApplicationManager.getApplication().invokeLater {
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

class OpenSettingsAction : AnAction("Settings", "Open Time Tracker settings", AllIcons.General.GearPlain) {
    override fun actionPerformed(e: AnActionEvent) {
        ShowSettingsUtil.getInstance().showSettingsDialog(e.project, TimeTrackerSettingsConfigurable::class.java)
    }
}

class RefreshTreeAction(
    private val onRefresh: () -> Unit
) : AnAction("Refresh", "Refresh the project tree", AllIcons.Actions.Refresh), ActionUpdateThreadAware {
    override fun actionPerformed(e: AnActionEvent) {
        onRefresh()
    }

    override fun getActionUpdateThread(): ActionUpdateThread {
        return ActionUpdateThread.EDT
    }
}

class BackgroundImagePanel(private val backgroundImage: Image) : JPanel() {
    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2d = g.create() as Graphics2D
        g2d.drawImage(backgroundImage, 0, 0, width, height, this)
        g2d.dispose()
    }
}


class TimeTrackerToolWindowFactory : ToolWindowFactory {
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")

    private fun showProjectUrlsInFooter(label: JBLabel, projectName: String) {
        val urls = getProjectUrls(projectName)
        val html = buildString {
            append("<html><i>URLs:</i><br>")
            for (i in 0 until urls.length()) {
                append(urls.getString(i)).append("<br>")
            }
            append("</html>")
        }
        label.text = html
    }

    fun getProjectUrls(projectName: String): JSONArray {
        val urls = DBManager.queryUrls(projectName)

        val result = JSONArray()
        for (i in 0 until urls.length()) {
            val entry = urls.getJSONObject(i)
            val url   = entry.optString("url", "")
            if (url.isNotEmpty()) {
                result.put(url)
            }
        }

        return result
    }

    private fun computeDetailedBreakdown(history: JSONArray): Triple<Map<String, Int>, Map<String, Map<String, Int>>, Map<String, Int>> {
        val timeout = TimeTrackerSettings.getInstance().state.keystrokeTimeoutSeconds.toLong()

        val sorted = (0 until history.length())
            .mapNotNull { history.optJSONObject(it) }
            .sortedBy { it.optString("start") }

        val typeDuration = mutableMapOf<String, Int>()
        val browsingMap = mutableMapOf<String, MutableMap<String, Int>>()
        val fileMap = mutableMapOf<String, Int>()

        var lastEnd: LocalDateTime? = null
        var groupStart: LocalDateTime? = null
        var groupEnd: LocalDateTime? = null
        var groupType: String? = null
        var groupFile: String? = null
        var groupHost: String? = null
        var groupUrl: String? = null

        fun flushGroup() {
            if (groupType == null || groupStart == null || groupEnd == null) return
            val duration = Duration.between(groupStart, groupEnd).seconds.toInt().coerceAtLeast(0)
            if (groupType == "browsing") {
                val host = groupHost ?: "unknown"
                val url = groupUrl ?: "unknown"
                val urls = browsingMap.computeIfAbsent(host) { mutableMapOf() }
                urls[url] = urls.getOrDefault(url, 0) + duration
            } else {
                typeDuration[groupType!!] = typeDuration.getOrDefault(groupType!!, 0) + duration
                if (groupType == "coding" && groupFile != null) {
                    fileMap[groupFile!!] = fileMap.getOrDefault(groupFile!!, 0) + duration
                }
            }
            groupType = null
            groupFile = null
            groupHost = null
            groupUrl = null
            groupStart = null
            groupEnd = null
        }

        val grouped = HistoryGrouper.groupCloseSessions(sorted)

        for (entry in sorted) {
            val type = entry.optString("type", "unknown")
            val start = try { LocalDateTime.parse(entry.getString("start")) } catch (_: Exception) { continue }
            val end = try { LocalDateTime.parse(entry.getString("end")) } catch (_: Exception) { continue }
            val file = entry.optString("file", null)
            val host = entry.optString("host", null)
            val url = entry.optString("url", null)

            if (lastEnd != null && Duration.between(lastEnd, start).seconds > timeout) {
                flushGroup()
            }

            if (groupStart == null) {
                groupStart = start
                groupType = type
                groupFile = file
                groupHost = host
                groupUrl = url
            }
            groupEnd = end
            lastEnd = end
        }
        flushGroup()

        return Triple(typeDuration, browsingMap, fileMap)
    }


    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {

        try {
            BrowsingTrackerServer.start()
        } catch (e: BindException) {
            println("⚠️ Port already in use. Server may already be running.")
        }

        fun isBrowsingServerRunning(): Boolean {
            return try {
                Socket().apply {
                    soTimeout = 500
                    connect(InetSocketAddress("localhost", BrowsingTrackerServer.port), 500)
                    close()
                }
                true
            } catch (e: Exception) {
                false
            }
        }

        val panel = JPanel(BorderLayout(10, 10))
        val contentFactory = ContentFactory.getInstance()
        val content = contentFactory.createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)

        val initialLoadLength = 7
        val projectName = project.name
        val todayStr = LocalDate.now().toString()

        val durationLabel = JBLabel()
        val urlFooterLabel = JBLabel()
        val weeklyTotalLabel = JBLabel()

        val root = DefaultMutableTreeNode("Projets")
        val treeModel = DefaultTreeModel(root)
        val tree = JTree(treeModel)
        tree.isRootVisible = false
        val treeScrollPane = JBScrollPane(tree)
        treeScrollPane.border = BorderFactory.createEmptyBorder(0, 0, 0, 10) // top, left, bottom, right

        val config = if (dataFile.exists()) JSONObject(dataFile.readText()).optJSONObject("config")
            ?: JSONObject() else JSONObject()
        val showHiddenInitially = config.optBoolean("showHidden", false)
        var showHidden = showHiddenInitially

        fun getProjectData(date: String): JSONObject? {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            return json.optJSONObject(date)?.optJSONObject(projectName)
        }

        fun refreshTime(date: String) {
            val projectData = getProjectData(date)
            val duration = projectData?.optInt("duration", 0)?.div(60) ?: 0
            durationLabel.text = "Aujourd'hui: $duration min"

            val urls = getProjectUrls(projectName)
            val urlText = (0 until urls.length()).joinToString("<br>") { urls.getString(it) }
            urlFooterLabel.text = "<html><strong>URLs:</strong><br>$urlText</html>"
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
                            name.startsWith("http") -> AllIcons.Ide.External_link_arrow
                            name.contains("/") || name.contains(".") -> {
                                val fileName = name.substringAfterLast("/")
                                val fileType = FileTypeManager.getInstance()
                                    .getFileTypeByFileName(fileName)
                                fileType.icon ?: AllIcons.FileTypes.Any_type
                            }

                            name.matches(Regex("""\d{4}-\d{2}-\d{2}""")) -> AllIcons.General.Layout
                            name == "Browsing" -> AllIcons.General.Web // 🌍 closest globe-style icon
                            name == "Coding" -> AllIcons.Actions.Execute // 🧑‍💻 code icon (you can choose another)
                            else -> AllIcons.Nodes.Module
                        }
                    }
                }

                // ✅ Force transparent background after super + content logic
                background = null
                isOpaque = false
                backgroundNonSelectionColor = null
                borderSelectionColor = null

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
                    val parsedDate = try {
                        LocalDate.parse(dateKey, DateTimeFormatter.ISO_DATE)
                    } catch (_: Exception) {
                        continue
                    }
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

// 🧠 Wrap files under a "💻 Coding" node

                        val history = projectObj?.optJSONArray("history")
                        if (history != null) {
                            val (durations, browsing, files) = computeDetailedBreakdown(history)

                            durations.forEach { (type, seconds) ->
                                if (type == "browsing") return@forEach
                                val h = seconds / 3600
                                val m = (seconds % 3600) / 60
                                val formatted = if (h > 0) "${h}h${m}m" else "${m}m"
                                val typeNode = DefaultMutableTreeNode(
                                    Pair(
                                        type.replaceFirstChar { it.uppercaseChar() },
                                        formatted
                                    )
                                )

                                // Show coding files under "Coding" node
                                if (type == "coding" && files.isNotEmpty()) {
                                    files.forEach { (file, sec) ->
                                        val fh = sec / 3600
                                        val fm = (sec % 3600) / 60
                                        val fileFormatted = if (fh > 0) "${fh}h${fm}m" else "${fm}m"
                                        typeNode.add(DefaultMutableTreeNode(Pair(file, fileFormatted)))
                                    }
                                }

                                dayNode.add(typeNode)
                            }

                            if (browsing.isNotEmpty()) {
                                val totalBrowsingSec = browsing.values.sumOf { it.values.sum() }
                                val bh = totalBrowsingSec / 3600
                                val bm = (totalBrowsingSec % 3600) / 60
                                val totalBrowsingFormatted = if (bh > 0) "${bh}h${bm}m" else "${bm}m"
                                val browsingNode = DefaultMutableTreeNode(Pair("Browsing", totalBrowsingFormatted))

                                browsing.forEach { (host, urlMap) ->
                                    val hostNode = DefaultMutableTreeNode(host)
                                    urlMap.forEach { (url, sec) ->
                                        val bh = sec / 3600
                                        val bm = (sec % 3600) / 60
                                        val formatted = if (bh > 0) "${bh}h${bm}m" else "${bm}m"
                                        hostNode.add(DefaultMutableTreeNode(Pair(url, formatted)))
                                    }
                                    if (hostNode.childCount > 0) browsingNode.add(hostNode)
                                }
                                dayNode.add(browsingNode)
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

            //refreshTime(LocalDate.now().toString())
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

            val urls = DBManager.queryUrls(projectName)

            // Create dialog
            val dialog = JDialog(null as Frame?, "Modifier les URLs", true)
            dialog.layout = BorderLayout(10, 10)

            val listModel = DefaultListModel<String>()
            for (i in 0 until urls.length()) {
                val entry = urls.getJSONObject(i)
                val url   = entry.optString("url", "")
                listModel.addElement(url)
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
                DBManager.removeUrls(projectName)
                for (i in 0 until listModel.size()) {
                    println("saveButton.addActionListener"+ listModel.get(i))
                    DBManager.insertUrl(projectName, listModel.get(i))
                }

                dialog.dispose()
                showProjectUrlsInFooter(urlFooterLabel, projectName)
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
            add(
                ToggleHiddenProjectsAction(
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
            add(RefreshTreeAction { updateSummary() })
            add(OpenSettingsAction()) // 👈 Add this line
        }
        val actionToolbar =
            ActionManager.getInstance().createActionToolbar("MXO.TimeTracker.Toolbar", actionGroup, true)
        actionToolbar.setTargetComponent(tree)

        val toolbarPanel = JPanel(BorderLayout()).apply {

            add(actionToolbar.component, BorderLayout.EAST)
        }

        val topPanel = JPanel()
        topPanel.layout = BoxLayout(topPanel, BoxLayout.Y_AXIS)
        topPanel.add(toolbarPanel)

        val bgImage = ImageIcon(javaClass.getResource("/icons/background-mxo.png")).image
        val logoIcon = ImageIcon(javaClass.getResource("/icons/logo-mxo.png"))

        val logoWithBg = BackgroundImagePanel(bgImage).apply {
            layout = GridBagLayout()
            border = BorderFactory.createEmptyBorder(10, 10, 0, 10)
            preferredSize = Dimension(400, 150)
            add(JLabel(logoIcon))
        }

        topPanel.add(logoWithBg)

        val statsPanel = JPanel()
        statsPanel.layout = BoxLayout(statsPanel, BoxLayout.Y_AXIS)
        statsPanel.border = BorderFactory.createEmptyBorder(10, 10, 10, 10)
        statsPanel.isOpaque = true
        weeklyTotalLabel.font = UIUtil.getLabelFont().deriveFont(Font.BOLD, 12f)
        durationLabel.foreground = JBColor.GRAY
        durationLabel.font = UIUtil.getLabelFont().deriveFont(Font.PLAIN, 11f)

        statsPanel.add(weeklyTotalLabel)
        statsPanel.add(durationLabel)

        val bottomPanel = JPanel()
        bottomPanel.layout = BoxLayout(bottomPanel, BoxLayout.Y_AXIS)
        bottomPanel.border = BorderFactory.createEmptyBorder(0, 10, 10, 10)

        urlFooterLabel.font = UIUtil.getLabelFont().deriveFont(Font.ITALIC, 11f)
        urlFooterLabel.isOpaque = true

        bottomPanel.add(urlFooterLabel, BorderLayout.CENTER)

        val bottomWrapper = JPanel()
        bottomWrapper.layout = BoxLayout(bottomWrapper, BoxLayout.Y_AXIS)
        bottomWrapper.add(statsPanel)
        bottomWrapper.add(bottomPanel)

        panel.add(topPanel, BorderLayout.NORTH)
        panel.add(treeScrollPane, BorderLayout.CENTER)
        panel.add(bottomWrapper, BorderLayout.SOUTH)

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
            val selectedNode =
                event.path?.lastPathComponent as? DefaultMutableTreeNode ?: return@addTreeSelectionListener
            val userObj = selectedNode.userObject
            val projectName = when (userObj) {
                is Pair<*, *> -> userObj.first as? String
                else -> null
            }

            if (projectName != null && selectedNode.level == 1) {
                showProjectUrlsInFooter(urlFooterLabel, projectName)
            } else {
                urlFooterLabel.text = ""
            }
        }

        refreshTime(todayStr)
        updateSummary()

        val refreshTimer = Timer(60_000) {
            updateSummary()
        }
        refreshTimer.start()

        val serverWatchdogTimer = Timer(1 * 60 * 1000) {
            if (!isBrowsingServerRunning()) {
                println("BrowsingTrackerServer is not running. Restarting...")
                try {
                    BrowsingTrackerServer.start()
                } catch (ex: Exception) {
                    println("Failed to restart BrowsingTrackerServer: ${ex.message}")
                }
            }
        }
        serverWatchdogTimer.start()
    }
}
