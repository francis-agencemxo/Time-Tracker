package com.codepulse.timetracker.timeline.util

import java.awt.Color

object ProjectColorManager {
    private val colorMap = mutableMapOf<String, Color>()
    private val colorPalette = listOf(
        Color(0x00393A), // OPS
        Color(0x0A5D60), // ihr
        Color(0xA87B5C), // mxoutils
        Color(0x893813), // prb-sai
        Color(0xBA68C8), // fallback if more projects
    )

    fun getColor(projectName: String): Color {
        return colorMap.getOrPut(projectName) {
            val index = colorMap.size % colorPalette.size
            colorPalette[index]
        }
    }

    fun reset() {
        colorMap.clear()
    }
}