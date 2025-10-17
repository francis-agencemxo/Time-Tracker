"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { StatsData, ProjectCustomName, ProjectClient } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { Clock, Code, Globe, FileText, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TimesheetViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[]
  projectCustomNames?: ProjectCustomName[]
  projectClients?: ProjectClient[]
  wrikeProjectMappings?: Array<{
    projectName: string
    wrikeProjectId: string
    wrikeProjectTitle: string
    wrikePermalink: string
  }>
}

interface DayProjectDetail {
  day: string
  date: string
  project: string
  hours: number
  sessions: Array<{
    start: string
    end: string
    duration: number
    type: "coding" | "browsing"
    file?: string
    url?: string
    host?: string
  }>
}

export function TimesheetView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [],
  projectCustomNames = [],
  projectClients = [],
  wrikeProjectMappings = [],
}: TimesheetViewProps) {
  const [selectedCell, setSelectedCell] = useState<DayProjectDetail | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { getStackedWeeklyData, getProjectChartData, formatHoursForChart, getMergedSessionsForProjectDay, calculateMergedDuration } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
    ignoredProjects,
  )

  // Helper function to get display name for a project
  const getProjectDisplayName = (projectName: string): string => {
    const customName = projectCustomNames.find((p) => p.projectName === projectName)
    return customName ? customName.customName : projectName
  }

  // Helper function to get client name for a project
  const getProjectClient = (projectName: string): string | null => {
    const client = projectClients.find((p) => p.projectName === projectName)
    return client ? client.clientName : null
  }

  // Helper function to get Wrike mapping for a project
  const getWrikeMapping = (projectName: string) => {
    return wrikeProjectMappings.find((m) => m.projectName === projectName)
  }

  const stackedData = getStackedWeeklyData()
  const projectColors = getProjectChartData()

  // Create a color map for consistent project colors
  const colorMap = projectColors.reduce(
    (acc, project) => {
      acc[project.name] = project.color
      return acc
    },
    {} as { [key: string]: string },
  )

  // Get all unique projects from the week
  const allProjects = Array.from(
    new Set(stackedData.flatMap((day) => Object.keys(day).filter((key) => !["day", "date", "target"].includes(key)))),
  ).sort()

  // Create chart config for all projects
  const chartConfig = allProjects.reduce((config, project) => {
    config[project] = {
      label: project,
      color: colorMap[project] || "#8884d8",
    }
    return config
  }, {} as any)

  // Add target to config
  chartConfig.target = {
    label: "Target Hours",
    color: "#e5e7eb",
  }

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value)
    if (name === "target") {
      return [formatHoursForChart(numValue), "Target Hours"]
    }
    return [formatHoursForChart(numValue), name]
  }

  // Calculate table data
  const tableData = stackedData.map((day) => {
    const projectHours: { [key: string]: number } = {}
    let totalHours = 0

    Object.entries(day).forEach(([key, value]) => {
      if (!["day", "date", "target"].includes(key)) {
        projectHours[key] = value as number
        totalHours += value as number
      }
    })

    return {
      day: day.day,
      date: day.date as string,
      totalHours,
      projectHours,
    }
  })

  // Calculate column totals (project totals for the week)
  const projectTotals = allProjects.reduce((acc, project) => {
    const total = tableData.reduce((sum, day) => sum + (day.projectHours[project] || 0), 0)
    acc[project] = total
    return acc
  }, {} as { [key: string]: number })

  // Calculate overall weekly total
  const weeklyTotal = Object.values(projectTotals).reduce((sum, hours) => sum + hours, 0)

  // Handle cell click to show session details
  const handleCellClick = (day: string, date: string, project: string, hours: number) => {
    if (hours === 0) return

    // Get the day's data from statsData
    const dayData = statsData[date]
    if (!dayData || !dayData[project]) return

    const projectData = dayData[project]
    const mergedSessions = getMergedSessionsForProjectDay(projectData)

    const sessions = mergedSessions.map((session) => {
      const startTime = new Date(session.start)
      const endTime = new Date(session.end)
      return {
        start: session.start,
        end: session.end,
        duration: (endTime.getTime() - startTime.getTime()) / 1000,
        type: session.type,
        file: session.file,
        url: session.url,
        host: session.host,
      }
    })

    setSelectedCell({
      day,
      date,
      project,
      hours,
      sessions,
    })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Timesheet Table - Inverted: Projects as Rows, Days as Columns */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Timesheet</CardTitle>
          <CardDescription>Click any cell to view session details for that day and project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="py-3 px-4 text-left font-semibold text-gray-700 bg-gray-50">Project</th>
                  {tableData.map((day) => (
                    <th key={day.date} className="py-3 px-4 text-right font-semibold text-gray-700 bg-gray-50">
                      {day.day}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-semibold text-gray-700 bg-teal-50">Total</th>
                </tr>
              </thead>
              <tbody>
                {allProjects.map((project) => {
                  const wrikeMapping = getWrikeMapping(project)
                  const clientName = getProjectClient(project)
                  return (
                    <tr key={project} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorMap[project] }}></div>
                          <div className="flex flex-col">
                            <span>{getProjectDisplayName(project)}</span>
                            {clientName && (
                              <span className="text-xs text-gray-500 font-normal">{clientName}</span>
                            )}
                          </div>
                          {wrikeMapping && (
                            <a
                              href={wrikeMapping.wrikePermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 ml-1"
                              title={`Open ${wrikeMapping.wrikeProjectTitle} in Wrike`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      {tableData.map((day) => {
                        const hours = day.projectHours[project] || 0
                        return (
                          <td
                            key={day.date}
                            className={`py-3 px-4 text-right ${
                              hours > 0 ? "cursor-pointer hover:bg-teal-50 font-medium" : "text-gray-400"
                            }`}
                            onClick={() => hours > 0 && handleCellClick(day.day, day.date, project, hours)}
                          >
                            {hours > 0 ? formatHoursForChart(hours) : "-"}
                          </td>
                        )
                      })}
                      <td className="py-3 px-4 text-right font-bold text-teal-800 bg-teal-50">
                        {formatHoursForChart(projectTotals[project])}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300">
                  <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                  {tableData.map((day) => (
                    <td key={day.date} className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatHoursForChart(day.totalHours)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-bold text-teal-900 bg-teal-100">
                    {formatHoursForChart(weeklyTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCell && (
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: colorMap[selectedCell.project] }}
                  ></div>
                  <span>
                    {selectedCell.day} - {getProjectDisplayName(selectedCell.project)}
                  </span>
                  <Badge variant="outline">{formatHoursForChart(selectedCell.hours)}</Badge>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedCell && (
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="websites">Websites</TabsTrigger>
              </TabsList>

              {/* Timeline View with 24-hour bar */}
              <TabsContent value="timeline" className="space-y-4">
                <div className="text-sm text-gray-600">
                  {selectedCell.sessions.length} session{selectedCell.sessions.length !== 1 ? "s" : ""}
                </div>

                {/* 24-hour horizontal timeline */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold mb-3">Activity Timeline</h4>
                  <div className="relative h-12 bg-white rounded border">
                    {/* Hour markers */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 border-r border-gray-200 text-xs text-gray-400 px-1">
                          {i.toString().padStart(2, "0")}
                        </div>
                      ))}
                    </div>
                    {/* Session bars */}
                    <div className="absolute inset-0 pt-6">
                      {selectedCell.sessions.map((session, index) => {
                        const startTime = new Date(session.start)
                        const endTime = new Date(session.end)
                        const startHour = startTime.getHours() + startTime.getMinutes() / 60
                        const endHour = endTime.getHours() + endTime.getMinutes() / 60
                        const left = (startHour / 24) * 100
                        const width = ((endHour - startHour) / 24) * 100

                        return (
                          <div
                            key={index}
                            className="absolute h-6 rounded"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: session.type === "coding" ? "#2D5A5A" : "#F59E0B",
                              opacity: 0.8,
                            }}
                            title={`${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: "#2D5A5A" }}></div>
                      <span>Coding</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: "#F59E0B" }}></div>
                      <span>Browsing</span>
                    </div>
                  </div>
                </div>

                {/* Session list */}
                <div className="space-y-2">
                  {selectedCell.sessions.map((session, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-2 pt-1">
                        {session.type === "coding" ? (
                          <Code className="w-4 h-4 text-teal-600" />
                        ) : (
                          <Globe className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={session.type === "coding" ? "default" : "secondary"}>{session.type}</Badge>
                          <div className="text-sm font-medium">
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
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-600">
                            <Clock className="w-3 h-3" />
                            {formatHoursForChart(session.duration / 3600)}
                          </div>
                        </div>
                        {session.file && (
                          <div className="text-sm text-gray-600 truncate" title={session.file}>
                            <FileText className="w-3 h-3 inline mr-1" />
                            {session.file}
                          </div>
                        )}
                        {session.url && (
                          <a
                            href={session.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate"
                            title={session.url}
                          >
                            <Globe className="w-3 h-3" />
                            {session.host || new URL(session.url).hostname}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="space-y-2">
                {(() => {
                  const files = selectedCell.sessions
                    .filter((s) => s.type === "coding" && s.file)
                    .reduce((acc, session) => {
                      const file = session.file!
                      if (!acc[file]) {
                        acc[file] = { file, duration: 0, sessions: 0 }
                      }
                      acc[file].duration += session.duration
                      acc[file].sessions += 1
                      return acc
                    }, {} as { [key: string]: { file: string; duration: number; sessions: number } })

                  const fileList = Object.values(files).sort((a, b) => b.duration - a.duration)

                  return fileList.length > 0 ? (
                    fileList.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-sm truncate" title={item.file}>
                            {item.file}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>{item.sessions} session{item.sessions !== 1 ? "s" : ""}</span>
                          <span className="font-medium">{formatHoursForChart(item.duration / 3600)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">No files recorded</div>
                  )
                })()}
              </TabsContent>

              {/* Websites Tab */}
              <TabsContent value="websites" className="space-y-2">
                {(() => {
                  const urls = selectedCell.sessions
                    .filter((s) => s.type === "browsing" && s.url)
                    .reduce((acc, session) => {
                      const url = session.url!
                      if (!acc[url]) {
                        acc[url] = { url, host: session.host || new URL(url).hostname, duration: 0, sessions: 0 }
                      }
                      acc[url].duration += session.duration
                      acc[url].sessions += 1
                      return acc
                    }, {} as { [key: string]: { url: string; host: string; duration: number; sessions: number } })

                  const urlList = Object.values(urls).sort((a, b) => b.duration - a.duration)

                  return urlList.length > 0 ? (
                    urlList.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Globe className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 truncate flex items-center gap-1"
                            title={item.url}
                          >
                            {item.host}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>{item.sessions} session{item.sessions !== 1 ? "s" : ""}</span>
                          <span className="font-medium">{formatHoursForChart(item.duration / 3600)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">No websites recorded</div>
                  )
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
