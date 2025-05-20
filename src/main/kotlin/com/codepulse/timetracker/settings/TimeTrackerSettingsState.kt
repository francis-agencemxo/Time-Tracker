package com.codepulse.timetracker.settings

data class TimeTrackerSettingsState(
    var autoStartBrowsing: Boolean = false,
    var showPopupOnTrack: Boolean = false,
    var dailyGoalHours: Double = 8.0
)
