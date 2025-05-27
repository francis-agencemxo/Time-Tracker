package com.codepulse.timetracker

import com.codepulse.timetracker.settings.TimeTrackerSettings
import org.json.JSONObject
import java.time.Duration
import java.time.LocalDateTime

object HistoryGrouper {
    /**
     * Merge sessions that are separated by less than or equal to the configured keystroke timeout,
     * ignoring any type/file/host/url metadata. Returns a list of JSONObjects with only start/end.
     */
    fun groupCloseSessions(entries: List<JSONObject>): List<JSONObject> {
        // 1) Sort by start time
        val sorted = entries
            .map { it } // ensure non-null
            .sortedBy { LocalDateTime.parse(it.getString("start")) }

        val result = mutableListOf<JSONObject>()
        val gapSeconds = TimeTrackerSettings.getInstance().state.keystrokeTimeoutSeconds

        var groupStart: LocalDateTime? = null
        var groupEnd: LocalDateTime?   = null

        // Helper to flush the current accumulated group
        fun flushGroup() {
            if (groupStart != null && groupEnd != null) {
                result += JSONObject().apply {
                    put("start", groupStart.toString())
                    put("end",   groupEnd.toString())
                }
            }
            groupStart = null
            groupEnd   = null
        }

        for (entry in sorted) {
            val start = LocalDateTime.parse(entry.getString("start"))
            val end   = LocalDateTime.parse(entry.getString("end"))

            if (groupEnd != null) {
                val gap = Duration.between(groupEnd, start).seconds
                if (gap > gapSeconds) {
                    // gap too large → emit previous group
                    flushGroup()
                }
            }

            if (groupStart == null) {
                // starting new group
                groupStart = start
                groupEnd   = end
            } else {
                // extend current group end if this session goes later
                if (end.isAfter(groupEnd)) groupEnd = end
            }
        }

        // emit any final group
        flushGroup()
        return result
    }
}
