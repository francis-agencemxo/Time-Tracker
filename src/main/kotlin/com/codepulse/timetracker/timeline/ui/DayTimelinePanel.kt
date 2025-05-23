package com.codepulse.timetracker.timeline.ui

import com.intellij.ui.JBColor
import org.json.JSONArray
import org.json.JSONObject
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.awt.event.MouseMotionAdapter
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeParseException
import javax.swing.JPanel

class DayTimelinePanel(private var history: JSONArray) : JPanel() {

    private val tooltipMap = mutableMapOf<Rectangle, String>()
    private val expandedProjects = mutableSetOf<String>()
    private val rowHeight = 24
    private val padding = 6
    private val labelWidth = 180
    private val timelineLeft = labelWidth + 8
    private val secondsInDay = 24 * 60 * 60
    private val topPadding = 20
    private val rowHeightWithPadding = rowHeight + padding

    private var projectRowBounds: List<Pair<String, Rectangle>> = emptyList()

    init {
        preferredSize = Dimension(1000, 150)
        background = JBColor.PanelBackground

        toolTipText = ""
        addMouseMotionListener(object : MouseMotionAdapter() {
            override fun mouseMoved(e: MouseEvent) {
                val tip = tooltipMap.entries.firstOrNull { it.key.contains(e.point) }?.value
                toolTipText = tip ?: ""
            }
        })

        addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                projectRowBounds.firstOrNull { it.second.contains(e.point) }?.first?.let { clickedProject ->
                    if (expandedProjects.contains(clickedProject)) expandedProjects.remove(clickedProject)
                    else expandedProjects.add(clickedProject)
                    repaint()
                }
            }
        })
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        tooltipMap.clear()
        projectRowBounds = emptyList()

        val groupedByProject = mutableMapOf<String, MutableList<JSONObject>>()
        for (i in 0 until history.length()) {
            val obj = history.getJSONObject(i)
            val project = obj.optString("project", "Unknown")
            groupedByProject.computeIfAbsent(project) { mutableListOf() }.add(obj)
        }

        val projectDurations = groupedByProject.mapValues { (_, entries) ->
            entries.sumOf {
                val start = LocalDateTime.parse(it.getString("start"))
                val end = LocalDateTime.parse(it.getString("end"))
                Duration.between(start, end).seconds
            }
        }

        val fileDurationsByProject = groupedByProject.mapValues { (_, entries) ->
            entries.groupBy { it.optString("file", "[no file]") }.mapValues { (_, fileEntries) ->
                fileEntries.sumOf {
                    val start = LocalDateTime.parse(it.getString("start"))
                    val end = LocalDateTime.parse(it.getString("end"))
                    Duration.between(start, end).seconds
                }
            }
        }

        val groupedProjectKeys = groupedByProject.keys.sorted()
        val totalRows = groupedProjectKeys.sumOf {
            1 + if (expandedProjects.contains(it)) fileDurationsByProject[it]?.size ?: 0 else 0
        }
        preferredSize = Dimension(width, topPadding + totalRows * rowHeightWithPadding + 40)

        g2.color = JBColor.GRAY
        g2.font = Font("SansSerif", Font.PLAIN, 10)
        for (h in 0..24) {
            val x = timelineLeft + (h / 24.0 * (width - timelineLeft)).toInt()
            g2.drawLine(x, 0, x, height)
            val label = "${h}h"
            val labelWidthPx = g2.fontMetrics.stringWidth(label)
            g2.drawString(label, x - labelWidthPx / 2, height - 10)
        }

        var rowY = topPadding
        val rowBounds = mutableListOf<Pair<String, Rectangle>>()

        for (project in groupedProjectKeys) {
            val entries = groupedByProject[project] ?: continue
            val duration = formatDuration(projectDurations[project] ?: 0)

            val label = if (expandedProjects.contains(project)) "▼ $project ($duration)" else "▶ $project ($duration)"
            g2.font = Font("Monospaced", Font.BOLD, 11)
            g2.color = JBColor.foreground()
            g2.drawString(label, 5, rowY + rowHeight / 2 + 4)

            rowBounds.add(project to Rectangle(0, rowY, timelineLeft, rowHeight))
            drawBars(entries, g2, rowY)

            rowY += rowHeightWithPadding

            if (expandedProjects.contains(project)) {
                val files = entries.groupBy { it.optString("file", "[no file]") }
                for ((file, fileEntries) in files.entries.sortedBy { it.key }) {
                    val fileDuration = formatDuration(fileDurationsByProject[project]?.get(file) ?: 0)
                    g2.font = Font("Monospaced", Font.PLAIN, 11)
                    g2.drawString("   $file ($fileDuration)", 8, rowY + rowHeight / 2 + 4)
                    drawBars(fileEntries, g2, rowY)
                    rowY += rowHeightWithPadding
                }
            }
        }

        projectRowBounds = rowBounds
    }

    private fun drawBars(entries: List<JSONObject>, g2: Graphics2D, y: Int) {
        for (entry in entries) {
            try {
                val start = LocalDateTime.parse(entry.getString("start"))
                val end = LocalDateTime.parse(entry.getString("end"))
                val type = entry.optString("type", "unknown")
                val startSec = start.toLocalTime().toSecondOfDay()
                val endSec = end.toLocalTime().toSecondOfDay()
                val x = timelineLeft + (startSec / secondsInDay.toDouble() * (width - timelineLeft)).toInt()
                val w = ((endSec - startSec) / secondsInDay.toDouble() * (width - timelineLeft)).toInt().coerceAtLeast(1)

                g2.color = when (type) {
                    "coding" -> JBColor.BLUE
                    "browsing" -> JBColor.ORANGE
                    else -> JBColor.GRAY
                }

                val rect = Rectangle(x, y, w, rowHeight - 4)
                g2.fill(rect)
                g2.color = g2.color.darker()
                g2.draw(rect)

                val duration = Duration.between(start, end).seconds
                val minutes = duration / 60
                val seconds = duration % 60
                tooltipMap[rect] = "$type: ${minutes}m ${seconds}s"

            } catch (e: DateTimeParseException) {
                continue
            }
        }
    }

    private fun formatDuration(seconds: Long): String {
        val h = seconds / 3600
        val m = (seconds % 3600) / 60
        return if (h > 0) "${h}h${m}m" else "${m}m"
    }
}