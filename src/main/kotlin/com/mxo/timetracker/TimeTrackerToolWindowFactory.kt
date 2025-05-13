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
import javax.swing.table.DefaultTableModel
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
        toolWindow.title = "Time Tracker"
        toolWindow.contentManager.addContent(content)

        val projectName = project.name
        val todayStr = LocalDate.now().toString()

        val dateField = JBTextField(todayStr)
        val loadButton = JButton("Afficher")
        val resetButton = JButton("🔄 Reset")
        val durationLabel = JBLabel().apply {
            horizontalAlignment = SwingConstants.LEFT
        }
        val urlFooterLabel = JBLabel()
        val editUrlsButton = JButton("✏️ Modifier URLs")
        val weeklyTotalLabel = JBLabel()

        val summaryPanel = JPanel(BorderLayout())
        val summaryTableModel = DefaultTableModel(arrayOf("Project", "Time"), 0)
        val summaryTable = JTable(summaryTableModel)
        summaryTable.fillsViewportHeight = true
        summaryTable.preferredScrollableViewportSize = Dimension(350, 150)
        summaryTable.autoCreateRowSorter = true
        val scrollPane = JBScrollPane(summaryTable)
        summaryPanel.add(scrollPane, BorderLayout.CENTER)
        summaryPanel.add(weeklyTotalLabel, BorderLayout.SOUTH)

        fun updateSummary() {
            summaryTableModel.rowCount = 0
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
                            weeklyTotalSeconds += duration
                        }
                    }
                }

                for ((key, duration) in weeklyProjectTotals.entries) {
                    val hours = duration / 3600
                    val minutes = (duration % 3600) / 60
                    val formatted = if (hours > 0) "${hours}h${minutes}m" else "${minutes}m"
                    summaryTableModel.addRow(arrayOf(key, formatted))
                }
            }

            val totalH = weeklyTotalSeconds / 3600
            val totalM = (weeklyTotalSeconds % 3600) / 60
            weeklyTotalLabel.text = "Total cette semaine : ${if (totalH > 0) "${totalH}h${totalM}m" else "${totalM}m"}"
        }

        val popupMenu = JPopupMenu()
        val hideItem = JMenuItem("Hide")
        val deleteItem = JMenuItem("Delete")

        popupMenu.add(hideItem)
        popupMenu.add(deleteItem)

// Action handlers
        hideItem.addActionListener {
            val selectedRow = summaryTable.selectedRow
            if (selectedRow >= 0) {
                summaryTableModel.removeRow(summaryTable.convertRowIndexToModel(selectedRow))
            }
        }

        deleteItem.addActionListener {
            val selectedRow = summaryTable.selectedRow
            if (selectedRow >= 0) {
                val projectToDelete = summaryTableModel.getValueAt(summaryTable.convertRowIndexToModel(selectedRow), 0).toString()

                val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
                var changed = false

                // Remove project from all days
                for (key in json.keySet()) {
                    if (key == "config") continue
                    val dayData = json.optJSONObject(key)
                    if (dayData?.has(projectToDelete) == true) {
                        dayData.remove(projectToDelete)
                        changed = true
                    }
                }

                // Remove config
                json.optJSONObject("config")?.remove(projectToDelete)

                if (changed) {
                    dataFile.writeText(json.toString(2))
                    summaryTableModel.removeRow(summaryTable.convertRowIndexToModel(selectedRow))
                }
            }
        }
        summaryTable.componentPopupMenu = popupMenu

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

        editUrlsButton.addActionListener {
            val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
            val configNode = json.optJSONObject("config") ?: JSONObject()
            val projectConfig = configNode.optJSONObject(projectName) ?: JSONObject()
            val urls = projectConfig.optJSONArray("urls") ?: JSONArray()

            val dialog = JDialog(null as Frame?, "Modifier les URLs", true)
            dialog.layout = BorderLayout(10, 10)

            val listModel = DefaultListModel<String>()
            for (i in 0 until urls.length()) {
                listModel.addElement(urls.getString(i))
            }

            val urlList = JBList(listModel)
            val scrollPaneEdit = JBScrollPane(urlList)

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
            centerPanel.add(scrollPaneEdit, BorderLayout.CENTER)
            centerPanel.add(buttonRow, BorderLayout.SOUTH)

            dialog.add(inputRow, BorderLayout.NORTH)
            dialog.add(centerPanel, BorderLayout.CENTER)
            dialog.add(footerRow, BorderLayout.SOUTH)

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
                refreshTime(dateField.text.trim())
            }

            cancelButton.addActionListener {
                dialog.dispose()
            }

            dialog.setSize(400, 300)
            dialog.setLocationRelativeTo(null)
            dialog.isVisible = true
        }

        val timer = Timer(60000) {
            val now = dateField.text.trim()
            if (now == todayStr) {
                val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
                val dayData = json.optJSONObject(now) ?: JSONObject()
                val projectData = dayData.optJSONObject(projectName) ?: JSONObject()

                val currentDuration = projectData.optInt("duration", 0)
                projectData.put("duration", currentDuration + 60)

                dayData.put(projectName, projectData)
                json.put(now, dayData)
                dataFile.writeText(json.toString(2))

                refreshTime(now)
                updateSummary()
            }
        }
        timer.start()

        val topPanel = JPanel()
        topPanel.layout = BoxLayout(topPanel, BoxLayout.Y_AXIS)
        val dateRow = JPanel(BorderLayout())
        dateRow.add(dateField, BorderLayout.CENTER)
        val buttons = JPanel(FlowLayout(FlowLayout.RIGHT)).apply {
            add(loadButton)
            add(resetButton)
        }
        dateRow.add(buttons, BorderLayout.EAST)
        topPanel.add(dateRow)
        //topPanel.add(durationLabel)

        val bottomPanel = JPanel(BorderLayout())
        bottomPanel.add(urlFooterLabel, BorderLayout.CENTER)
        bottomPanel.add(editUrlsButton, BorderLayout.EAST)

        panel.add(topPanel, BorderLayout.NORTH)
        panel.add(summaryPanel, BorderLayout.CENTER)
        panel.add(bottomPanel, BorderLayout.SOUTH)

        refreshTime(todayStr)
        updateSummary()
    }
}
