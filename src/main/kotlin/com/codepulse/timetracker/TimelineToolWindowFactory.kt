package com.codepulse.timetracker.timeline

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import com.codepulse.timetracker.timeline.ui.StackedTimelinePanel
import org.json.JSONArray
import org.json.JSONObject
import java.awt.*
import java.io.File
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.*
import javax.swing.*

class TimelineToolWindowFactory : ToolWindowFactory {
    private val dataFile = File(System.getProperty("user.home") + "/.cache/phpstorm-time-tracker/data.json")
    private var weekOffset = 0
    private lateinit var scrollPane: JBScrollPane
    private lateinit var weekLabel: JLabel

    private fun generateFakeHistory(): JSONArray {
        val history = JSONArray()
        val today = LocalDate.now()
        val base = today.with(DayOfWeek.MONDAY)
        val projects = listOf("mxoutils", "ihr", "prb-sai", "OPS")
        val rand = Random()

        for (weekOffset in 0 until 10) {
            val weekStart = base.minusWeeks(weekOffset.toLong())
            for (d in 0 until 7) {
                if (d == 5 || d == 6) continue // Skip weekends

                val date = weekStart.plusDays(d.toLong())
                for (project in projects) {
                    val sessionCount = rand.nextInt(3) + 1
                    for (s in 0 until sessionCount) {
                        val startHour = 9 + rand.nextInt(6) // between 9AM–3PM
                        val startMin = rand.nextInt(60)
                        val durationMin = 25 + rand.nextInt(45) // between 15–60 minutes

                        val start = date.atTime(startHour, startMin)
                        val end = start.plusMinutes(durationMin.toLong())

                        if (start.isAfter(LocalDate.now().atStartOfDay())) continue

                        history.put(JSONObject().apply {
                            put("date", date.toString())
                            put("project", project)
                            put("start", start.toString())
                            put("end", end.toString())
                            put("type", if (project == "ihr") "browsing" else "coding")
                        })
                    }
                }
            }
        }

        return history
    }

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val contentFactory = ContentFactory.getInstance()
        val panel = JPanel(BorderLayout())

        scrollPane = JBScrollPane()
        weekLabel = JLabel()
        weekLabel.horizontalAlignment = SwingConstants.CENTER

        val leftArrow = JButton("←")
        val rightArrow = JButton("→")
        val todayButton = JButton("Today")

        fun updateWeekLabel() {
            val now = LocalDate.now().plusWeeks(weekOffset.toLong())
            val start = now.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1)
            val end = start.plusDays(6)

            val formatter = DateTimeFormatter.ofPattern("d MMMM", Locale.FRENCH)
            weekLabel.text = "${formatter.format(start)} au ${formatter.format(end)}"
        }

        fun updateTimeline() {
            val newHistory = loadFilteredHistory(project.name, weekOffset)
            val newPanel = StackedTimelinePanel(newHistory, weekOffset)
            //val newPanel = StackedTimelinePanel(generateFakeHistory(), weekOffset)
            scrollPane.setViewportView(newPanel)
            updateWeekLabel()
        }

        leftArrow.addActionListener { weekOffset--; updateTimeline() }
        rightArrow.addActionListener { weekOffset++; updateTimeline() }
        todayButton.addActionListener { weekOffset = 0; updateTimeline() }

        val toolbar = JPanel(BorderLayout())
        val arrows = JPanel(FlowLayout(FlowLayout.LEFT))
        arrows.add(leftArrow)
        arrows.add(rightArrow)
        arrows.add(todayButton)
        toolbar.add(arrows, BorderLayout.WEST)
        toolbar.add(weekLabel, BorderLayout.CENTER)

        panel.add(toolbar, BorderLayout.NORTH)
        panel.add(scrollPane, BorderLayout.CENTER)

        updateTimeline()

        val content = contentFactory.createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }

    private fun loadFilteredHistory(projectName: String, weekOffset: Int): JSONArray {
        val json = if (dataFile.exists()) JSONObject(dataFile.readText()) else JSONObject()
        val fullHistory = JSONArray()
        val targetWeek = LocalDate.now().plusWeeks(weekOffset.toLong())
        val weekFields = WeekFields.of(Locale.getDefault())
        val targetWeekNumber = targetWeek.get(weekFields.weekOfWeekBasedYear())
        val targetYear = targetWeek.year

        for (dateKey in json.keySet()) {
            if (dateKey == "config") continue
            val date = try {
                LocalDate.parse(dateKey, DateTimeFormatter.ISO_DATE)
            } catch (_: Exception) { continue }

            val weekNum = date.get(weekFields.weekOfWeekBasedYear())
            if (weekNum != targetWeekNumber || date.year != targetYear) continue

            val dayData = json.optJSONObject(dateKey) ?: continue
            for (project in dayData.keySet()) {
                val projectData = dayData.optJSONObject(project) ?: continue
                val historyArray = projectData.optJSONArray("history") ?: continue

                for (i in 0 until historyArray.length()) {
                    val entry = historyArray.getJSONObject(i)
                    entry.put("date", dateKey)
                    entry.put("project", project)
                    fullHistory.put(entry)
                }
            }
        }

        return fullHistory
    }
}
