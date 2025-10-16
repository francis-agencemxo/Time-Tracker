"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Code, Globe, ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { formatDateInEST, formatDateLong, dateToESTString, createESTDate } from "@/lib/date-utils"

interface DailyDetailsSimpleProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[]
  selectedDate?: string
  onDateChange?: (date: string) => void
}

interface ProcessedSession {
  project: string
  color: string
  start: string
  end: string
  duration: number
  type: "coding" | "browsing"
}

export function DailyDetailsSimple({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [],
  selectedDate,
  onDateChange,
}: DailyDetailsSimpleProps) {
  // Initialize selected date to today or provided date
  const [currentDate, setCurrentDate] = useState<string>(() => {
    if (selectedDate) return selectedDate
    return dateToESTString(new Date())
  })

  const { formatDuration, formatHoursForChart, getMergedSessionsForProjectDay, getProjectChartData } =
    useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes, ignoredProjects)

  // Get available dates from stats data
  const availableDates = Object.keys(statsData).sort().reverse()

  // Get data for the selected date
  const dayData = statsData[currentDate] || {}
  const projectColors = getProjectChartData()

  // Create color map for consistent project colors
  const colorMap = projectColors.reduce(
    (acc, project) => {
      acc[project.name] = project.color
      return acc
    },
    {} as { [key: string]: string },
  )

  // Process all sessions for the day
  const processedSessions: ProcessedSession[] = Object.entries(dayData)
    .flatMap(([projectName, projectData]) => {
      const mergedSessions = getMergedSessionsForProjectDay(projectData)
      return mergedSessions.map((session) => {
        const startTime = new Date(session.start)
        const endTime = new Date(session.end)
        return {
          project: projectName,
          color: colorMap[projectName] || "#8884d8",
          start: session.start,
          end: session.end,
          duration: (endTime.getTime() - startTime.getTime()) / 1000,
          type: session.type,
        }
      })
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // Calculate daily totals by project
  const dailyTotals = Object.entries(dayData).map(([projectName, projectData]) => {
    const mergedSessions = getMergedSessionsForProjectDay(projectData)
    const duration = mergedSessions.reduce((sum, session) => {
      const startTime = new Date(session.start)
      const endTime = new Date(session.end)
      return sum + (endTime.getTime() - startTime.getTime()) / 1000
    }, 0)

    return {
      project: projectName,
      duration,
      hours: duration / 3600,
      sessions: mergedSessions.length,
      color: colorMap[projectName] || "#8884d8",
    }
  })

  const totalDayHours = dailyTotals.reduce((sum, project) => sum + project.hours, 0)

  // Navigation functions
  const navigateDate = (direction: "prev" | "next") => {
    const currentDateObj = createESTDate(currentDate)
    const newDate = new Date(currentDateObj)
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    const newDateString = dateToESTString(newDate)
    setCurrentDate(newDateString)
    if (onDateChange) {
      onDateChange(newDateString)
    }
  }

  const handleDateSelect = (date: string) => {
    setCurrentDate(date)
    if (onDateChange) {
      onDateChange(date)
    }
  }

  return (
    <div className="space-y-6">
      {/* Date Navigation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Daily Details
                </CardTitle>
                <CardDescription>{formatDateLong(currentDate)}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={currentDate} onValueChange={handleDateSelect}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a date" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {formatDateInEST(date, { weekday: "short", month: "short", day: "numeric" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">{formatHoursForChart(totalDayHours)}</div>
            <p className="text-sm text-gray-600">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">{processedSessions.length}</div>
            <p className="text-sm text-gray-600">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">
              {processedSessions.filter((s) => s.type === "coding").length}
            </div>
            <p className="text-sm text-gray-600">Coding Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">{dailyTotals.length}</div>
            <p className="text-sm text-gray-600">Active Projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Project Breakdown</CardTitle>
            <CardDescription>Time spent on each project today</CardDescription>
          </CardHeader>
          <CardContent>
            {dailyTotals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No activity recorded for this day</div>
            ) : (
              <div className="space-y-3">
                {dailyTotals
                  .sort((a, b) => b.hours - a.hours)
                  .map((project) => (
                    <div key={project.project} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }}></div>
                        <div>
                          <div className="font-medium">{project.project}</div>
                          <div className="text-sm text-gray-600">{project.sessions} sessions</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatHoursForChart(project.hours)}</div>
                        <div className="text-sm text-gray-600">
                          {Math.round((project.hours / totalDayHours) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Session Timeline</CardTitle>
            <CardDescription>Chronological view of your work sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {processedSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No sessions recorded for this day</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {processedSessions.map((session, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: session.color }}></div>
                      {session.type === "coding" ? (
                        <Code className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Globe className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{session.project}</div>
                        <Badge variant={session.type === "coding" ? "default" : "secondary"}>{session.type}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(session.start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(session.end).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <Clock className="w-3 h-3" />
                      {formatDuration(session.duration)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
