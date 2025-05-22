package com.codepulse.timetracker.timeline

import com.codepulse.timetracker.timeline.ui.DayTimelinePanel
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
    private lateinit var tabbedPane: JTabbedPane
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

        val tabbedPane = JTabbedPane()
        var weekOffset = 0
        var dayOffset = 0

        val weekScrollPane = JBScrollPane()
        val dayScrollPane = JBScrollPane()
        val weekLabel = JLabel()
        val dayLabel = JLabel()

        fun updateWeekLabel() {
            val now = LocalDate.now().plusWeeks(weekOffset.toLong())
            val start = now.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1)
            val end = start.plusDays(6)
            val formatter = DateTimeFormatter.ofPattern("d MMMM", Locale.FRENCH)
            weekLabel.text = "${formatter.format(start)} au ${formatter.format(end)}"
        }

        fun updateDayLabel() {
            val date = LocalDate.now().plusDays(dayOffset.toLong())
            val formatter = DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.FRENCH)
            dayLabel.text = formatter.format(date)
        }

        fun updateWeekTimeline() {
            val weekHistory = loadFilteredHistory(project.name, weekOffset)
            //weekScrollPane.setViewportView(StackedTimelinePanel(weekHistory, weekOffset))
            weekScrollPane.setViewportView(StackedTimelinePanel(generateFakeHistory(), weekOffset))
            updateWeekLabel()
        }

        fun updateDayTimeline() {
            val targetDate = LocalDate.now().plusDays(dayOffset.toLong()).toString()
            val fullHistory = loadFilteredHistory(project.name, 0)
            val todayHistory = JSONArray()
            for (i in 0 until fullHistory.length()) {
                val entry = fullHistory.getJSONObject(i)
                if (entry.optString("date") == targetDate) {
                    todayHistory.put(entry)
                }
            }
            dayScrollPane.setViewportView(DayTimelinePanel(todayHistory))
            updateDayLabel()
        }

        // Week navigation controls
        val weekControls = JPanel(BorderLayout())
        val weekNav = JPanel(FlowLayout(FlowLayout.LEFT))
        val weekLeft = JButton("←")
        val weekRight = JButton("→")
        val weekToday = JButton("Aujourd'hui")

        weekLeft.addActionListener { weekOffset--; updateWeekTimeline() }
        weekRight.addActionListener { weekOffset++; updateWeekTimeline() }
        weekToday.addActionListener { weekOffset = 0; updateWeekTimeline() }

        weekNav.add(weekLeft)
        weekNav.add(weekRight)
        weekNav.add(weekToday)
        weekControls.add(weekNav, BorderLayout.WEST)
        weekControls.add(weekLabel, BorderLayout.CENTER)

        // Day navigation controls
        val dayControls = JPanel(BorderLayout())
        val dayNav = JPanel(FlowLayout(FlowLayout.LEFT))
        val dayLeft = JButton("←")
        val dayRight = JButton("→")
        val dayToday = JButton("Aujourd'hui")

        dayLeft.addActionListener { dayOffset--; updateDayTimeline() }
        dayRight.addActionListener { dayOffset++; updateDayTimeline() }
        dayToday.addActionListener { dayOffset = 0; updateDayTimeline() }

        dayNav.add(dayLeft)
        dayNav.add(dayRight)
        dayNav.add(dayToday)
        dayControls.add(dayNav, BorderLayout.WEST)
        dayControls.add(dayLabel, BorderLayout.CENTER)

        // Add both timelines with their toolbars
        val weekView = JPanel(BorderLayout())
        weekView.add(weekControls, BorderLayout.NORTH)
        weekView.add(weekScrollPane, BorderLayout.CENTER)

        val dayView = JPanel(BorderLayout())
        dayView.add(dayControls, BorderLayout.NORTH)
        dayView.add(dayScrollPane, BorderLayout.CENTER)

        tabbedPane.addTab("Semaine", weekView)
        tabbedPane.addTab("Aujourd'hui", dayView)

        panel.add(tabbedPane, BorderLayout.CENTER)

        updateWeekTimeline()
        updateDayTimeline()

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
