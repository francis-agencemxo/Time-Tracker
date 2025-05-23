package com.codepulse.timetracker

import com.codepulse.timetracker.settings.TimeTrackerSettings
import org.json.JSONObject
import java.time.Duration
import java.time.LocalDateTime

object HistoryGrouper {
    fun groupCloseSessions(entries: List<JSONObject>): List<JSONObject> {
        val sorted = entries.sortedBy { LocalDateTime.parse(it.getString("start")) }
        val result = mutableListOf<JSONObject>()

        val gapSeconds = TimeTrackerSettings.getInstance().state.keystrokeTimeoutSeconds

        var groupStart: LocalDateTime? = null
        var groupEnd: LocalDateTime? = null
        var groupType: String? = null
        var groupFile: String? = null

        fun flushGroup() {
            if (groupStart != null && groupEnd != null && groupType != null) {
                val obj = JSONObject()
                obj.put("start", groupStart.toString())
                obj.put("end", groupEnd.toString())
                obj.put("type", groupType)
                groupFile?.let { obj.put("file", it) }
                result.add(obj)
            }
            groupStart = null
            groupEnd = null
            groupType = null
            groupFile = null
        }

        for (entry in sorted) {
            val start = LocalDateTime.parse(entry.getString("start"))
            val end = LocalDateTime.parse(entry.getString("end"))
            val type = entry.getString("type")
            val file = entry.optString("file", null)

            if (groupEnd != null && Duration.between(groupEnd, start).seconds > gapSeconds) {
                flushGroup()
            }

            if (groupStart == null) {
                groupStart = start
                groupType = type
                groupFile = file
            }

            groupEnd = maxOf(groupEnd ?: end, end)
        }

        flushGroup()
        return result
    }
}
