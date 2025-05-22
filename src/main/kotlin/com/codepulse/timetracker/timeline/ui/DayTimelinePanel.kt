package com.codepulse.timetracker.timeline.ui

import com.intellij.ui.JBColor
import org.json.JSONArray
import org.json.JSONObject
import java.awt.*
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeParseException
import javax.swing.JPanel

class DayTimelinePanel(private var history: JSONArray) : JPanel() {

    companion object {
        var DEBUG_USE_FAKE_DATA = false

        fun generateFakeHistory(
            daysBack: Int = 7,
            onlyDate: LocalDate? = null
        ): JSONArray {
            val history = JSONArray()
            val today = LocalDate.now()
            val projects = listOf("mxoutils", "ihr", "prb-sai", "OPS")
            val rand = java.util.Random()

            for (d in 0 until daysBack) {
                val date = today.minusDays(d.toLong())
                if (onlyDate != null && date != onlyDate) continue

                for (project in projects) {
                    val sessionCount = rand.nextInt(3) + 1
                    for (s in 0 until sessionCount) {
                        val startHour = 8 + rand.nextInt(10) // 8AM–6PM
                        val startMin = rand.nextInt(60)
                        val durationMin = 20 + rand.nextInt(50)

                        val start = date.atTime(startHour, startMin)
                        val end = start.plusMinutes(durationMin.toLong())

                        if (end.isAfter(LocalDate.now().atTime(23, 59))) continue

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

            return history
        }

        fun wrapFakeHistoryAsJSONObject(history: JSONArray): JSONObject {
            val result = JSONObject()

            for (i in 0 until history.length()) {
                val entry = history.getJSONObject(i)
                val date = entry.getString("date")
                val project = entry.optString("project", "Unknown")
                val start = LocalDateTime.parse(entry.getString("start"))
                val end = LocalDateTime.parse(entry.getString("end"))
                val duration = java.time.Duration.between(start, end).seconds.toInt()

                val dayNode = result.optJSONObject(date) ?: JSONObject().also {
                    result.put(date, it)
                }

                val projectNode = dayNode.optJSONObject(project) ?: JSONObject().also {
                    it.put("duration", 0)
                    it.put("history", JSONArray())
                    dayNode.put(project, it)
                }

                projectNode.put("duration", projectNode.getInt("duration") + duration)
                projectNode.getJSONArray("history").put(entry)
            }

            return result
        }
    }

    init {
        preferredSize = Dimension(1000, 150)
        background = JBColor.PanelBackground

        if (DEBUG_USE_FAKE_DATA) {
            history = generateFakeHistory(7)
        }
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        val width = width
        val secondsInDay = 24 * 60 * 60

        // Group by project
        val groupedByProject = mutableMapOf<String, MutableList<JSONObject>>()
        for (i in 0 until history.length()) {
            val obj = history.getJSONObject(i)
            val project = obj.optString("project", "Unknown")
            groupedByProject.computeIfAbsent(project) { mutableListOf() }.add(obj)
        }

        val rowHeight = 24
        val padding = 6
        val labelWidth = 100
        val timelineLeft = labelWidth + 8
        val totalHeight = groupedByProject.size * (rowHeight + padding)
        preferredSize = Dimension(width, totalHeight + 40)

        // Draw hour ticks
        g2.color = JBColor.GRAY
        g2.font = Font("SansSerif", Font.PLAIN, 10)
        for (h in 0..24) {
            val x = timelineLeft + (h / 24.0 * (width - timelineLeft)).toInt()
            g2.drawLine(x, 0, x, totalHeight + 20)
            val label = "${h}h"
            val labelWidthPx = g2.fontMetrics.stringWidth(label)
            g2.drawString(label, x - labelWidthPx / 2, totalHeight + 30)
        }

        var rowIndex = 0
        for ((project, entries) in groupedByProject.entries.sortedBy { it.key }) {
            val y = rowIndex * (rowHeight + padding) + 20

            // Draw label
            g2.color = JBColor.foreground()
            g2.drawString(project, 5, y + rowHeight / 2 + 4)

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

                    g2.fillRect(x, y, w, rowHeight - 4)
                    g2.color = g2.color.darker()
                    g2.drawRect(x, y, w, rowHeight - 4)

                } catch (e: DateTimeParseException) {
                    continue
                }
            }

            rowIndex++
        }
    }
}
