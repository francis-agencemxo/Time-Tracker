package com.codepulse.timetracker.timeline.ui

import com.intellij.ui.JBColor
import org.json.JSONArray
import java.awt.*
import javax.swing.JPanel
import java.time.LocalDateTime
import java.time.format.DateTimeParseException

class TimelinePanel(private val history: JSONArray) : JPanel() {
    init {
        preferredSize = Dimension(1000, 60)
        background = JBColor.PanelBackground
    }

    override fun paintComponent(g: Graphics) {
        super.paintComponent(g)
        val g2 = g as Graphics2D
        val width = width
        val height = height
        val secondsInDay = 24 * 60 * 60

        g2.color = JBColor.border()
        g2.drawLine(0, height / 2, width, height / 2)

        for (i in 0 until history.length()) {
            val obj = history.getJSONObject(i)
            try {
                val start = LocalDateTime.parse(obj.getString("start"))
                val end = LocalDateTime.parse(obj.getString("end"))
                val type = obj.optString("type", "unknown")

                val startSec = start.toLocalTime().toSecondOfDay()
                val endSec = end.toLocalTime().toSecondOfDay()
                val x = (startSec / secondsInDay.toDouble() * width).toInt()
                val w = ((endSec - startSec) / secondsInDay.toDouble() * width).toInt()

                g2.color = when (type) {
                    "coding" -> JBColor.BLUE
                    "browsing" -> JBColor.ORANGE
                    else -> JBColor.GRAY
                }
                g2.fillRect(x, height / 2 - 10, w.coerceAtLeast(1), 20)
            } catch (e: DateTimeParseException) {
                // skip malformed entry
            }
        }
    }
}
