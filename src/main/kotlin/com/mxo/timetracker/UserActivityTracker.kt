package com.mxo.timetracker

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.WindowManager
import java.awt.AWTEvent
import java.awt.Toolkit
import java.awt.event.AWTEventListener

object UserActivityTracker {
    @Volatile
    var lastActive: Long = System.currentTimeMillis()

    fun register() {
        val listener = AWTEventListener {
            lastActive = System.currentTimeMillis()
        }
        Toolkit.getDefaultToolkit().addAWTEventListener(
            listener,
            AWTEvent.KEY_EVENT_MASK or AWTEvent.MOUSE_EVENT_MASK or AWTEvent.MOUSE_MOTION_EVENT_MASK
        )
    }

    fun isIdle(project: Project, thresholdMillis: Long): Boolean {
        val idleTooLong = System.currentTimeMillis() - lastActive > thresholdMillis
        val projectFrame = WindowManager.getInstance().getFrame(project)
        val isFocused = projectFrame?.isActive == true
        return idleTooLong || !isFocused
    }
}
