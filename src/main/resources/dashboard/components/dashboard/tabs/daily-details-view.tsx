"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Clock, Code, Globe, ChevronLeft, ChevronRight, Calendar, FileText, ExternalLink, Activity } from "lucide-react"
import type { StatsData, Session } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { formatDateInEST, formatDateLong, dateToESTString, createESTDate } from "@/lib/date-utils"

interface DailyDetailsViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[]
  selectedDate?: string
  onDateChange?: (date: string) => void
}

interface TimelineSession extends Session {
  project: string
  color: string
  duration: number
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export function DailyDetailsView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [],
  selectedDate,
  onDateChange,
}: DailyDetailsViewProps) {
  // Initialize selected date to today or provided date
  const [currentDate, setCurrentDate] = useState<string>(() => {
    if (selectedDate) return selectedDate
    return dateToESTString(new Date())
  })

  const [activeTimelineTab, setActiveTimelineTab] = useState<"overview" | "timeline">("timeline")

  const {
    formatDuration,
    formatHoursForChart,
    getMergedSessionsForProjectDay,
    calculateMergedDuration,
    getProjectChartData,
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes, ignoredProjects)

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

  // Process all sessions for the day (merged timeline)
  const processedSessions: TimelineSession[] = Object.entries(dayData)
    .flatMap(([projectName, projectData]) => {
      const mergedSessions = getMergedSessionsForProjectDay(projectData)
      return mergedSessions.map((session) => {
        const startTime = new Date(session.start)
        const endTime = new Date(session.end)
        return {
          ...session,
          project: projectName,
          color: colorMap[projectName] || "#8884d8",
          duration: (endTime.getTime() - startTime.getTime()) / 1000,
          startHour: startTime.getHours(),
          startMinute: startTime.getMinutes(),
          endHour: endTime.getHours(),
          endMinute: endTime.getMinutes(),
        }
      })
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  // Create detailed timeline data with 15-minute intervals
  const createDetailedTimeline = () => {
    const timeline: Array<{
      time: string
      hour: number
      minute: number
      sessions: TimelineSession[]
      activities: Array<{
        type: "coding" | "browsing"
        project: string
        file?: string
        url?: string
        host?: string
        color: string
        duration: number
      }>
    }> = []

    // Create 15-minute intervals for the entire day
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeSlot = {
          time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          hour,
          minute,
          sessions: [] as TimelineSession[],
          activities: [] as Array<{
            type: "coding" | "browsing"
            project: string
            file?: string
            url?: string
            host?: string
            color: string
            duration: number
          }>,
        }

        // Find sessions that overlap with this time slot
        const slotStart = hour * 60 + minute
        const slotEnd = slotStart + 15

        processedSessions.forEach((session) => {
          const sessionStart = session.startHour * 60 + session.startMinute
          const sessionEnd = session.endHour * 60 + session.endMinute

          // Check if session overlaps with this time slot
          if (sessionStart < slotEnd && sessionEnd > slotStart) {
            timeSlot.sessions.push(session)

            // Calculate overlap duration
            const overlapStart = Math.max(sessionStart, slotStart)
            const overlapEnd = Math.min(sessionEnd, slotEnd)
            const overlapDuration = Math.max(0, overlapEnd - overlapStart) * 60 // Convert to seconds

            if (overlapDuration > 0) {
              timeSlot.activities.push({
                type: session.type,
                project: session.project,
                file: session.file,
                url: session.url,
                host: session.host,
                color: session.color,
                duration: overlapDuration,
              })
            }
          }
        })

        // Only include time slots with activity
        if (timeSlot.sessions.length > 0) {
          timeline.push(timeSlot)
        }
      }
    }

    return timeline
  }

  // Create hourly breakdown for chart
  const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
    const hourSessions = processedSessions.filter((session) => {
      return session.startHour === hour
    })

    const totalDuration = hourSessions.reduce((sum, session) => sum + session.duration, 0)

    return {
      hour,
      hourLabel: `${hour.toString().padStart(2, "0")}:00`,
      sessions: hourSessions,
      totalHours: totalDuration / 3600,
      hasActivity: hourSessions.length > 0,
    }
  })

  // Calculate daily totals
  const dailyTotals = Object.entries(dayData).map(([projectName, projectData]) => {
    const mergedSessions = getMergedSessionsForProjectDay(projectData)
    const duration = calculateMergedDuration(mergedSessions)
    return {
      project: projectName,
      duration,
      hours: duration / 3600,
      sessions: mergedSessions.length,
      color: colorMap[projectName] || "#8884d8",
    }
  })

  const totalDayHours = dailyTotals.reduce((sum, project) => sum + project.hours, 0)
  const detailedTimeline = createDetailedTimeline()

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

  // Custom tooltip formatter for hourly chart
  const customTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value)
    return [formatHoursForChart(numValue), "Hours Worked"]
  }

  // Helper function to get file icon
  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "tsx":
      case "ts":
        return <Code className="w-3 h-3 text-blue-500" />
      case "json":
        return <FileText className="w-3 h-3 text-yellow-600" />
      case "md":
        return <FileText className="w-3 h-3 text-gray-600" />
      case "css":
        return <FileText className="w-3 h-3 text-purple-500" />
      default:
        return <FileText className="w-3 h-3 text-gray-500" />
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

      {/* Main Content Tabs */}
      <Tabs value={activeTimelineTab} onValueChange={(value) => setActiveTimelineTab(value as "overview" | "timeline")}>
        <TabsList>
          <TabsTrigger value="timeline">
            <Activity className="w-4 h-4 mr-2" />
            Detailed Timeline
          </TabsTrigger>
          <TabsTrigger value="overview">
            <Clock className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        {/* Detailed Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Merged Activity Timeline</CardTitle>
              <CardDescription>
                All projects combined - see exactly what files and websites you worked on throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailedTimeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No activity recorded for this day</div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {detailedTimeline.map((timeSlot, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      {/* Time Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-lg">{timeSlot.time}</span>
                          <Badge variant="outline" className="text-xs">
                            {timeSlot.activities.length} activities
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round(timeSlot.activities.reduce((sum, activity) => sum + activity.duration, 0) / 60)}{" "}
                          minutes
                        </div>
                      </div>

                      {/* Activities */}
                      <div className="space-y-2">
                        {timeSlot.activities.map((activity, activityIndex) => (
                          <div
                            key={activityIndex}
                            className="flex items-center gap-3 p-3 bg-white rounded border hover:bg-gray-50"
                          >
                            {/* Project Color & Type Icon */}
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activity.color }}></div>
                              {activity.type === "coding" ? (
                                <Code className="w-4 h-4 text-teal-600" />
                              ) : (
                                <Globe className="w-4 h-4 text-amber-600" />
                              )}
                            </div>

                            {/* Activity Details */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{activity.project}</span>
                                <Badge
                                  variant={activity.type === "coding" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {activity.type}
                                </Badge>
                              </div>

                              {/* File or URL Details */}
                              {activity.type === "coding" && activity.file ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  {getFileIcon(activity.file)}
                                  <span className="font-mono">{activity.file.split("/").pop()}</span>
                                  <span className="text-xs text-gray-400">
                                    {activity.file.includes("/")
                                      ? activity.file.substring(0, activity.file.lastIndexOf("/"))
                                      : ""}
                                  </span>
                                </div>
                              ) : activity.type === "browsing" && activity.url ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Globe className="w-3 h-3" />
                                  <a
                                    href={activity.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate max-w-md"
                                  >
                                    <span>{activity.host || new URL(activity.url).hostname}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">
                                  {activity.type === "coding" ? "No file information" : "No URL information"}
                                </div>
                              )}
                            </div>

                            {/* Duration */}
                            <div className="text-sm font-medium text-gray-700">
                              {Math.round(activity.duration / 60)}m
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Hourly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Hourly Activity</CardTitle>
              <CardDescription>Work distribution throughout the day (midnight to midnight)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  hours: {
                    label: "Hours",
                    color: "#2D5A5A",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyBreakdown} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hourLabel" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
                    <Bar dataKey="totalHours" fill="#2D5A5A" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

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
        </TabsContent>
      </Tabs>
    </div>
  )
}
