package com.codepulse.timetracker.timeline.ui

import com.intellij.ui.JBColor
import org.json.JSONArray
import org.json.JSONObject
import java.awt.*
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.awt.event.MouseMotionAdapter
import java.time.Duration
import java.time.LocalDateTime
import java.time.format.DateTimeParseException
import javax.swing.JPanel

class DayTimelinePanel(private var history: JSONArray) : JPanel() {

    private val tooltipMap = mutableMapOf<Rectangle, String>()
    private val expandedProjects = mutableSetOf<String>()
    private val expandedHosts = mutableSetOf<Pair<String, String>>() // Pair(project, host)

    private val rowHeight = 24
    private val padding = 6
    private val labelWidth = 300
    private val timelineLeft = labelWidth + 8
    private val secondsInDay = 24 * 60 * 60
    private val topPadding = 20
    private val rowHeightWithPadding = rowHeight + padding

    private var projectRowBounds: List<Pair<String, Rectangle>> = emptyList()
    private var hostRowBounds: List<Pair<Pair<String, String>, Rectangle>> = emptyList()

    init {
        background = JBColor.PanelBackground
        toolTipText = ""
        preferredSize = Dimension(1000, 150)

        addMouseMotionListener(object : MouseMotionAdapter() {
            override fun mouseMoved(e: MouseEvent) {
                toolTipText = tooltipMap.entries
                    .firstOrNull { it.key.contains(e.point) }
                    ?.value
                    ?: ""
            }
        })

        addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                val p = e.point
                // 1) toggle host expansion
                hostRowBounds.firstOrNull { it.second.contains(p) }?.first?.let { (proj, host) ->
                    (proj to host).let { key ->
                        if (!expandedHosts.remove(key)) expandedHosts += key
                    }
                    repaint()
                    return
                }
                // 2) toggle project expansion
                projectRowBounds.firstOrNull { it.second.contains(p) }?.first?.let { proj ->
                    if (!expandedProjects.remove(proj)) expandedProjects += proj
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
        hostRowBounds = emptyList()

        // 1) group entries by project
        val byProject = history.asSequence().map { it as JSONObject }
            .groupBy { it.optString("project", "Unknown") }

        // 2) compute total seconds per project
        val projectDurations = byProject.mapValues { (_, list) ->
            list.sumOf {
                val s = LocalDateTime.parse(it.getString("start"))
                val e = LocalDateTime.parse(it.getString("end"))
                Duration.between(s, e).seconds
            }
        }

        // 3) compute panel height
        val projects = byProject.keys.sorted()
        val totalRows = projects.sumOf { proj ->
            var count = 1
            if (proj in expandedProjects) {
                // coding files
                count += byProject[proj]!!
                    .filter { it.getString("type") == "coding" }
                    .groupBy { it.optString("file", "[no file]") }
                    .size
                // browsing hosts + urls
                byProject[proj]!!
                    .filter { it.getString("type") == "browsing" }
                    .groupBy { it.optString("host", "[no host]") }
                    .forEach { (host, entries) ->
                        count += 1
                        if ((proj to host) in expandedHosts) {
                            count += entries
                                .groupBy { it.optString("url", "[no url]") }
                                .size
                        }
                    }
            }
            count
        }
        preferredSize = Dimension(width, topPadding + totalRows * rowHeightWithPadding + 40)

        val lineBottomPadding = 20

        // 4) draw hour vertical lines
        g2.color = JBColor.GRAY
        g2.font = Font("", Font.PLAIN, 10)
        for (h in 0..24) {
            val x = timelineLeft + ((width - timelineLeft) * h / 24.0).toInt()
            g2.drawLine(x, 0, x, height - lineBottomPadding)
            val label = "${h}h"
            val lw = g2.fontMetrics.stringWidth(label)
            val labelY = height - lineBottomPadding / 2 + g2.fontMetrics.ascent/2
            g2.drawString(label, x - lw/2, labelY)
        }

        // 5) draw rows
        var y = topPadding
        val projBounds = mutableListOf<Pair<String, Rectangle>>()
        val hostBounds = mutableListOf<Pair<Pair<String,String>, Rectangle>>()

        for (proj in projects) {
            val list = byProject[proj]!!
            val totalSec = projectDurations[proj] ?: 0
            val totalFmt = formatDuration(totalSec)

            // project header
            g2.font = Font("", Font.BOLD, 11)
            g2.color = JBColor.foreground()
            val projLabel = if (proj in expandedProjects) "▼ $proj ($totalFmt)"
            else "▶ $proj ($totalFmt)"
            g2.drawString(projLabel, 5, y + rowHeight/2 + 4)
            projBounds += proj to Rectangle(0, y, timelineLeft, rowHeight)
            drawBars(list, g2, y)
            y += rowHeightWithPadding

            if (proj in expandedProjects) {
                // coding files
                val codeGroups = list.filter { it.getString("type")=="coding" }
                    .groupBy { it.optString("file","[no file]") }
                    .toSortedMap()
                for ((file, entries) in codeGroups) {
                    val sec = entries.sumOf {
                        val s = LocalDateTime.parse(it.getString("start"))
                        val e = LocalDateTime.parse(it.getString("end"))
                        Duration.between(s,e).seconds
                    }
                    val fmt = formatDuration(sec)
                    g2.font = Font("", Font.PLAIN, 11)
                    g2.color = JBColor.foreground()
                    g2.drawString("   $file ($fmt)", 8, y + rowHeight/2 + 4)
                    drawBars(entries, g2, y)
                    y += rowHeightWithPadding
                }

                // browsing hosts
                val hostGroups = list.filter { it.getString("type")=="browsing" }
                    .groupBy { it.optString("host","[no host]") }
                    .toSortedMap()
                for ((host, entries) in hostGroups) {
                    val sec = entries.sumOf {
                        val s = LocalDateTime.parse(it.getString("start"))
                        val e = LocalDateTime.parse(it.getString("end"))
                        Duration.between(s,e).seconds
                    }
                    val fmt = formatDuration(sec)
                    g2.font = Font("", Font.PLAIN, 11)
                    g2.color = JBColor.foreground()
                    val hostLabel = if ((proj to host) in expandedHosts)
                        "▼ $host ($fmt)"
                    else
                        "▶ $host ($fmt)"
                    g2.drawString("   $hostLabel", 8, y + rowHeight/2 + 4)
                    hostBounds += (proj to host) to Rectangle(0, y, timelineLeft, rowHeight)
                    drawBars(entries, g2, y)
                    y += rowHeightWithPadding

                    // URLs under host
                    if ((proj to host) in expandedHosts) {
                        entries.groupBy { it.optString("url","[no url]") }
                            .toSortedMap()
                            .forEach { (url, urlEntries) ->
                                val uSec = urlEntries.sumOf {
                                    val s = LocalDateTime.parse(it.getString("start"))
                                    val e = LocalDateTime.parse(it.getString("end"))
                                    Duration.between(s,e).seconds
                                }
                                val uFmt = formatDuration(uSec)
                                g2.font = Font("Monospaced", Font.PLAIN, 11)
                                g2.color = JBColor.foreground()
                                g2.drawString("      $url ($uFmt)", 12, y + rowHeight/2 + 4)
                                drawBars(urlEntries, g2, y)
                                y += rowHeightWithPadding
                            }
                    }
                }
            }
        }

        projectRowBounds = projBounds
        hostRowBounds = hostBounds
    }

    private fun drawBars(list: List<JSONObject>, g2: Graphics2D, y: Int) {
        for (obj in list) {
            try {
                val s = LocalDateTime.parse(obj.getString("start"))
                val e = LocalDateTime.parse(obj.getString("end"))
                val type = obj.optString("type","unknown")
                val startSec = s.toLocalTime().toSecondOfDay()
                val endSec = e.toLocalTime().toSecondOfDay()
                val x = timelineLeft + ((width - timelineLeft) * startSec / secondsInDay.toDouble()).toInt()
                val w = (((endSec - startSec) / secondsInDay.toDouble()) * (width - timelineLeft)).toInt()
                    .coerceAtLeast(1)

                g2.color = when(type) {
                    "coding"   -> JBColor.BLUE
                    "browsing" -> JBColor.ORANGE
                    else       -> JBColor.GRAY
                }
                val rect = Rectangle(x, y, w, rowHeight - 4)
                g2.fill(rect)
                g2.color = g2.color.darker()
                g2.draw(rect)

                val dur = Duration.between(s, e).seconds
                tooltipMap[rect] = "$type: ${dur/60}m ${dur%60}s"
            } catch (_: DateTimeParseException) {
            }
        }
    }

    private fun formatDuration(sec: Long): String {
        val h = sec / 3600
        val m = (sec % 3600) / 60
        return if (h>0) "${h}h${m}m" else "${m}m"
    }
}
