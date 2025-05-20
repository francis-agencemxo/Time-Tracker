package com.codepulse.timetracker.timeline.ui

import com.intellij.ui.JBColor
import org.json.JSONArray
import java.awt.*
import java.awt.event.MouseEvent
import java.awt.event.MouseMotionAdapter
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale
import javax.swing.JPanel
import com.codepulse.timetracker.settings.TimeTrackerSettings

class StackedTimelinePanel(
    historyArray: JSONArray,
    private val weekOffset: Int = 0
) : JPanel() {

    private val projectColorMap = mutableMapOf<String, Color>()
    val dailyGoalHours = TimeTrackerSettings.getInstance().state.dailyGoalHours

    private val colors = listOf(
        Color(0x00393A), // Velours
        Color(0x0A5D60), // Baumier
        Color(0xA87B5C), // Cèdre
        Color(0x893813), // Cognac
        Color(0xBA68C8), // Bonus
        Color(0xE57373), // Bonus
        Color(0x64B5F6)  // Bonus
    )

    private val data: MutableMap<String, MutableMap<String, Int>> = mutableMapOf()
    private val tooltipMap = mutableMapOf<Rectangle, String>()
    private val legendRects = mutableMapOf<Rectangle, String>()
    private val sortedDates: List<String>

    init {
        preferredSize = Dimension(1000, 240)
        background = JBColor.PanelBackground

        parseHistory(historyArray)

        val weekStart = LocalDate.now().with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1).plusWeeks(weekOffset.toLong())
        sortedDates = (0..6).map { weekStart.plusDays(it.toLong()).toString() }
        sortedDates.forEach { date -> data.putIfAbsent(date, mutableMapOf()) }

        toolTipText = ""
        addMouseMotionListener(object : MouseMotionAdapter() {
            override fun mouseMoved(e: MouseEvent) {
                val tooltip = tooltipMap.entries.firstOrNull { it.key.contains(e.point) }?.value
                    ?: legendRects.entries.firstOrNull { it.key.contains(e.point) }?.value
                toolTipText = tooltip ?: ""
            }
        })
    }

    private fun parseHistory(array: JSONArray) {
        var colorIndex = 0
        for (i in 0 until array.length()) {
            val obj = array.getJSONObject(i)
            val date = obj.optString("date")
            val project = obj.optString("project", "Unknown")

            val duration = try {
                val start = LocalDateTime.parse(obj.optString("start"))
                val end = LocalDateTime.parse(obj.optString("end"))
                Duration.between(start, end).seconds.toInt()
            } catch (e: Exception) {
                obj.optInt("duration", 0)
            }

            if (date.isEmpty() || duration <= 0) continue

            data.computeIfAbsent(date) { mutableMapOf() }
                .merge(project, duration, Int::plus)

            if (!projectColorMap.containsKey(project)) {
                val base = colors[colorIndex % colors.size]
                projectColorMap[project] = Color(base.red, base.green, base.blue, 180)
                colorIndex++
            }
        }
    }

    override fun paintComponent(g: Graphics) {
        // Fill background of legend column
        val legendColumnWidth = 160
        g.color = Color(30, 30, 30) // or a gradient later
        g.fillRect(0, 0, legendColumnWidth, height)
        super.paintComponent(g)
        val g2 = g as Graphics2D
        val dateCount = sortedDates.size
        if (dateCount == 0) return

        val widthPerDay = (width - legendColumnWidth) / dateCount
        val heightMax = height - 80
        val fixedScaleMinutes = 600.0 // 10h baseline
        val actualMaxMinutes = data.values.map { it.values.sum() }.maxOrNull()?.div(60.0) ?: 0.0
        val maxDayMinutes = if (actualMaxMinutes > dailyGoalHours * 60) actualMaxMinutes else fixedScaleMinutes
        val barWidth = (widthPerDay * 0.7).toInt()
        val projects = sortedDates.flatMap { data[it]?.keys ?: emptySet() }.distinct().sorted()

        tooltipMap.clear()
        legendRects.clear()

        val today = LocalDate.now()

        for ((i, dateStr) in sortedDates.withIndex()) {
            val projectMap = data[dateStr] ?: emptyMap()
            val date = LocalDate.parse(dateStr, DateTimeFormatter.ISO_DATE)

            val x = i * widthPerDay + legendColumnWidth
            if (weekOffset == 0 && date == today) {
                g2.color = JBColor(0xE3F2FD, 0x2C3E50)
                g2.fillRect(x, 0, widthPerDay, height)
            }

            var yOffset = height - 60
            var totalDaySeconds = 0

            for (project in projects) {
                val rawDuration = projectMap[project] ?: continue
                totalDaySeconds += rawDuration
                val duration = rawDuration / 60.0
                val h = (duration / maxDayMinutes * heightMax).toInt()

                val baseColor = projectColorMap[project] ?: JBColor.GRAY
                g2.color = Color(baseColor.red, baseColor.green, baseColor.blue, 180)

                val rect = Rectangle(x + (widthPerDay - barWidth) / 2, yOffset - h, barWidth, h)
                g2.fill(rect)

                g2.color = baseColor.darker()
                g2.drawRect(rect.x, rect.y, rect.width, rect.height)

                g2.color = JBColor.foreground()
                g2.font = Font("SansSerif", Font.BOLD, 10)
                val hours = rawDuration / 3600
                val minutes = (rawDuration % 3600) / 60
                val label = if (hours > 0) "${project} : ${hours}h${"%02d".format(minutes)}m" else "${project} : ${"%02d".format(minutes)}m"
                val fm = g2.fontMetrics
                if (rect.height > fm.height) {
                    val tx = rect.x + (rect.width - fm.stringWidth(label)) / 2
                    val ty = rect.y + (rect.height + fm.ascent) / 2 - 2
                    g2.drawString(label, tx, ty)
                }

                tooltipMap[rect] = "$project on $dateStr: $label"
                yOffset -= h
            }

            // Draw total duration at the bottom
            g2.color = JBColor.foreground()
            g2.font = Font("SansSerif", Font.BOLD, 10)
            val h = totalDaySeconds / 3600
            val m = (totalDaySeconds % 3600) / 60
            val totalLabel = if (h > 0) "$h h $m m" else "$m m"
            val fm = g2.fontMetrics
            g2.drawString(totalLabel, x + (widthPerDay - fm.stringWidth(totalLabel)) / 2, height - 45)
        }

        val goalY = height - 60 - (dailyGoalHours * 60 / maxDayMinutes * heightMax).toInt()
        val dashedStroke = BasicStroke(1f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL, 0f, floatArrayOf(4f, 4f), 0f)
        val oldStroke = g2.stroke
        g2.color = JBColor.GRAY
        g2.stroke = dashedStroke
        g2.drawLine(legendColumnWidth, goalY, width, goalY)
        g2.stroke = oldStroke

        // Draw divider line between legend and chart
        g2.color = JBColor.border()
        g2.drawLine(legendColumnWidth - 1, 0, legendColumnWidth - 1, height)

        // Draw X-axis labels
        g2.color = JBColor.foreground()
        g2.font = Font("SansSerif", Font.PLAIN, 10)
        for ((i, dateStr) in sortedDates.withIndex()) {
            val label = try {
                LocalDate.parse(dateStr, DateTimeFormatter.ISO_DATE)
                    .format(DateTimeFormatter.ofPattern("EEE d", Locale.FRENCH))
            } catch (e: Exception) {
                dateStr
            }
            val labelX = i * widthPerDay + legendColumnWidth + (widthPerDay - g2.fontMetrics.stringWidth(label)) / 2
            g2.drawString(label, labelX, height - 5)
        }

        // Draw legend
        val legendX = 10
        val legendY = 10
        val legendRowHeight = 20
        val legendBoxWidth = 150
        val visibleProjects = sortedDates.flatMap { data[it]?.keys ?: emptySet() }.distinct().sorted()
        val legendBoxHeight = visibleProjects.size * legendRowHeight + 12
        g2.color = Color(0, 0, 0, 204)
        g2.fillRoundRect(legendX, legendY, legendBoxWidth, legendBoxHeight, 10, 10)

        var ly = legendY + 6
        g2.font = Font("SansSerif", Font.PLAIN, 11)
        for (project in visibleProjects) {
            val color = projectColorMap[project] ?: JBColor.GRAY
            g2.color = color
            val rect = Rectangle(legendX + 8, ly, 12, 12)
            g2.fill(rect)
            g2.color = JBColor.foreground()
            g2.drawRect(rect.x, rect.y, rect.width, rect.height)
            val textY = ly + 11

            val totalSeconds = sortedDates.sumOf { data[it]?.get(project) ?: 0 }
            val h = totalSeconds / 3600
            val m = (totalSeconds % 3600) / 60
            g2.drawString("$project : ${h}h${"%02d".format(m)}m", rect.x + 18, textY)
            legendRects[rect] = "$project : ${h}h${"%02d".format(m)}m"

            ly += legendRowHeight
        }
        ly += legendRowHeight
    }

    fun setData(newHistory: JSONArray) {
        // optional future support
    }
}