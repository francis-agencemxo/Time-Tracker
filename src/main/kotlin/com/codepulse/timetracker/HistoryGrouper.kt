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
        var groupHost: String? = null
        var groupUrl: String? = null

        fun flushGroup() {
            if (groupStart != null && groupEnd != null && groupType != null) {
                val obj = JSONObject().apply {
                    put("start", groupStart.toString())
                    put("end",   groupEnd.toString())
                    put("type",  groupType)
                    groupFile?.let { put("file", it) }
                    groupHost?.let { put("host", it) }
                    groupUrl?.let  { put("url",  it) }
                }
                result += obj
            }
            groupStart = null
            groupEnd   = null
            groupType  = null
            groupFile  = null
            groupHost  = null
            groupUrl   = null
        }

        for (entry in sorted) {
            val start = LocalDateTime.parse(entry.getString("start"))
            val end   = LocalDateTime.parse(entry.getString("end"))
            val type  = entry.getString("type")
            val file  = entry.optString("file", null)
            val host  = entry.optString("host", null)
            val url   = entry.optString("url", null)

            if (groupStart == null) {
                // first entry in a new group
                groupStart = start
                groupType  = type
                groupFile  = file
                groupHost  = host
                groupUrl   = url
                groupEnd   = end
            } else {
                val gap = Duration.between(groupEnd, start).seconds
                // flush if too big a gap *or* different resource/type
                if (gap > gapSeconds
                    || type != groupType
                    || file != groupFile
                    || host != groupHost
                    || url  != groupUrl
                ) {
                    flushGroup()
                    // start new group
                    groupStart = start
                    groupType  = type
                    groupFile  = file
                    groupHost  = host
                    groupUrl   = url
                    groupEnd   = end
                } else {
                    // extend the current group
                    if (end.isAfter(groupEnd)) groupEnd = end
                }
            }
        }

        flushGroup()
        return result
    }
}
