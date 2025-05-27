package com.codepulse.timetracker.timeline

import com.codepulse.timetracker.DBManager
import com.codepulse.timetracker.HistoryGrouper
import com.codepulse.timetracker.TimeTrackerToolWindowFactory
import com.codepulse.timetracker.settings.TimeTrackerSettings
import com.codepulse.timetracker.settings.TimeTrackerSettingsConfigurable
import com.codepulse.timetracker.timeline.ui.DayTimelinePanel
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.content.ContentFactory
import com.codepulse.timetracker.timeline.ui.StackedTimelinePanel
import com.intellij.openapi.options.ShowSettingsUtil
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
            weekScrollPane.setViewportView(StackedTimelinePanel(weekHistory, weekOffset))
            //weekScrollPane.setViewportView(StackedTimelinePanel(generateFakeHistory(), weekOffset))
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

        // ⚙️ Settings button
        val weekSettingsButton = JButton("⚙️").apply {
            toolTipText = "Settings"
            addActionListener {
                ShowSettingsUtil
                    .getInstance()
                    .showSettingsDialog(project, TimeTrackerSettingsConfigurable::class.java)
            }
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
        weekNav.add(Box.createHorizontalStrut(8)) // spacing

        weekControls.add(weekNav, BorderLayout.WEST)
        weekControls.add(weekLabel, BorderLayout.CENTER)
        weekControls.add(weekSettingsButton, BorderLayout.EAST)

        // Day navigation controls
        val dayControls = JPanel(BorderLayout())
        val dayNav = JPanel(FlowLayout(FlowLayout.LEFT))
        val dayLeft = JButton("←")
        val dayRight = JButton("→")
        val dayToday = JButton("Aujourd'hui")

        // ⚙️ Settings button
        val daySettingsButton = JButton("⚙️").apply {
            toolTipText = "Settings"
            addActionListener {
                ShowSettingsUtil
                    .getInstance()
                    .showSettingsDialog(project, TimeTrackerSettingsConfigurable::class.java)
            }
        }

        dayLeft.addActionListener { dayOffset--; updateDayTimeline() }
        dayRight.addActionListener { dayOffset++; updateDayTimeline() }
        dayToday.addActionListener { dayOffset = 0; updateDayTimeline() }

        dayNav.add(dayLeft)
        dayNav.add(dayRight)
        dayNav.add(dayToday)
        dayNav.add(Box.createHorizontalStrut(8)) // spacing

        dayControls.add(dayNav, BorderLayout.WEST)
        dayControls.add(dayLabel, BorderLayout.CENTER)
        dayControls.add(daySettingsButton, BorderLayout.EAST)

        // Add both timelines with their toolbars
        val weekView = JPanel(BorderLayout())
        weekView.add(weekControls, BorderLayout.NORTH)
        weekView.add(weekScrollPane, BorderLayout.CENTER)

        val dayView = JPanel(BorderLayout())
        dayView.add(dayControls, BorderLayout.NORTH)
        dayView.add(dayScrollPane, BorderLayout.CENTER)

        tabbedPane.addTab("Semaine", weekView)
        tabbedPane.addTab("Jour", dayView)

        panel.add(tabbedPane, BorderLayout.CENTER)

        updateWeekTimeline()
        updateDayTimeline()

        val content = contentFactory.createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }


    private fun loadFilteredHistory(projectName: String, weekOffset: Int): JSONArray {
        val today = LocalDate.now().plusWeeks(weekOffset.toLong())
        val wf    = WeekFields.of(Locale.getDefault())
        val startOfWeek = today.with(wf.dayOfWeek(), 1)
        val endOfWeek   = startOfWeek.plusDays(6)
        return DBManager.querySessions(startOfWeek, endOfWeek)
    }
}
