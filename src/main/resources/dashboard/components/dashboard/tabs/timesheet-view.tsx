"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { StatsData, ProjectCustomName, ProjectClient, Commit } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { Clock, Code, Globe, FileText, ExternalLink, GitCommit, Video, Pencil, Loader2, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Toastify from "toastify-js"

interface TimesheetViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[]
  projectCustomNames?: ProjectCustomName[]
  projectClients?: ProjectClient[]
  commits?: Commit[]
  wrikeProjectMappings?: Array<{
    projectName: string
    wrikeProjectId: string
    wrikeProjectTitle: string
    wrikePermalink: string
  }>
  onReassignSessions: (sessionIds: number[], projectName: string) => Promise<void>
  onDeleteSessions: (sessionIds: number[]) => Promise<void>
}

interface DayProjectDetail {
  day: string
  date: string
  project: string
  hours: number
  sessions: Array<{
    id?: number
    start: string
    end: string
    duration: number
    type: "coding" | "browsing" | "meeting"
    file?: string
    url?: string
    host?: string
    meetingTitle?: string
    sessionIds?: number[]
  }>
}

export function TimesheetView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [],
  projectCustomNames = [],
  projectClients = [],
  commits = [],
  wrikeProjectMappings = [],
  onReassignSessions,
  onDeleteSessions,
}: TimesheetViewProps) {
  const [selectedCell, setSelectedCell] = useState<DayProjectDetail | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<{
    index: number
    sessionIds: number[]
    selectedProject: string
    currentProject: string
  } | null>(null)
  const [sessionUpdatePending, setSessionUpdatePending] = useState(false)
  const [sessionDeletePending, setSessionDeletePending] = useState(false)

  useEffect(() => {
    setEditingSession(null)
    setSessionUpdatePending(false)
    setSessionDeletePending(false)
  }, [selectedCell])

  const notifyProjectChange = (message: string, variant: "success" | "error" = "success") => {
    Toastify({
      text: message,
      duration: 4000,
      gravity: "top",
      position: "right",
      close: true,
      style: {
        background:
          variant === "success"
            ? "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)"
            : "linear-gradient(135deg, #f87171 0%, #b91c1c 100%)",
      },
    }).showToast()
  }

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

  const getSessionColor = (type: "coding" | "browsing" | "meeting") => {
    switch (type) {
      case "coding":
        return "#2D5A5A"
      case "meeting":
        return "#8B5CF6"
      default:
        return "#F59E0B"
    }
  }

  const formatSessionType = (type: "coding" | "browsing" | "meeting") => {
    switch (type) {
      case "coding":
        return "Coding"
      case "meeting":
        return "Meeting"
      default:
        return "Browsing"
    }
  }

  const getSessionIds = (session: DayProjectDetail["sessions"][number]): number[] => {
    if (session.sessionIds && session.sessionIds.length > 0) {
      return session.sessionIds
    }
    if (typeof session.id === "number" && !Number.isNaN(session.id)) {
      return [session.id]
    }
    return []
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setEditingSession(null)
      setSessionUpdatePending(false)
      setSessionDeletePending(false)
    }
    setIsDialogOpen(open)
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

  // Calculate project totals for sorting
  const projectTotalsForSorting = stackedData.reduce((acc, day) => {
    Object.entries(day).forEach(([key, value]) => {
      if (!["day", "date", "target"].includes(key)) {
        acc[key] = (acc[key] || 0) + (value as number)
      }
    })
    return acc
  }, {} as { [key: string]: number })

  // Get all unique projects from the week, sorted by total hours worked (descending)
  const allProjects = Array.from(
    new Set(stackedData.flatMap((day) => Object.keys(day).filter((key) => !["day", "date", "target"].includes(key)))),
  ).sort((a, b) => (projectTotalsForSorting[b] || 0) - (projectTotalsForSorting[a] || 0))

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
      const sessionIds =
        session.sessionIds && session.sessionIds.length > 0
          ? session.sessionIds
          : typeof session.id === "number" && !Number.isNaN(session.id)
            ? [session.id]
            : []
      return {
        id: session.id,
        start: session.start,
        end: session.end,
        duration: (endTime.getTime() - startTime.getTime()) / 1000,
        type: session.type,
        file: session.file,
        url: session.url,
        host: session.host,
        meetingTitle: session.meetingTitle || session.host,
        sessionIds,
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

  const handleStartEditingSession = (session: DayProjectDetail["sessions"][number], index: number) => {
    if (!selectedCell) return
    const ids = getSessionIds(session)
    if (ids.length === 0) {
      return
    }
    setEditingSession({
      index,
      sessionIds: ids,
      selectedProject: selectedCell.project,
      currentProject: selectedCell.project,
    })
  }

  const handleProjectSelectionChange = (value: string) => {
    setEditingSession((prev) => (prev ? { ...prev, selectedProject: value } : prev))
  }

  const handleCancelEditingSession = () => {
    if (sessionUpdatePending) return
    setEditingSession(null)
  }

  const handleConfirmProjectChange = async () => {
    if (!editingSession) return
    if (editingSession.selectedProject === editingSession.currentProject) {
      setEditingSession(null)
      return
    }

    try {
      setSessionUpdatePending(true)
      const { sessionIds, selectedProject } = editingSession
      await onReassignSessions(sessionIds, selectedProject)

      let shouldCloseDialog = false
      setSelectedCell((prev) => {
        if (!prev) return prev

        const idsToRemove = new Set(sessionIds)
        const remainingSessions = prev.sessions.filter((session) => {
          const ids = getSessionIds(session)
          return !ids.some((id) => idsToRemove.has(id))
        })

        if (remainingSessions.length === 0) {
          shouldCloseDialog = true
          return null
        }

        const remainingSeconds = remainingSessions.reduce((total, session) => total + session.duration, 0)

        return {
          ...prev,
          sessions: remainingSessions,
          hours: remainingSeconds / 3600,
        }
      })

      if (shouldCloseDialog) {
        setIsDialogOpen(false)
      }

      const reassignedCount = sessionIds.length
      const displayName = getProjectDisplayName(selectedProject)
      notifyProjectChange(`${reassignedCount} session${reassignedCount === 1 ? "" : "s"} reassigned to ${displayName}.`)

      setEditingSession(null)
    } catch (error) {
      console.error("Failed to reassign session project", error)
      notifyProjectChange("Failed to reassign sessions. Please try again.", "error")
    } finally {
      setSessionUpdatePending(false)
    }
  }

  const [sessionPendingDelete, setSessionPendingDelete] = useState<{
    ids: number[]
    description: string
  } | null>(null)

  const requestDeleteSession = (session: DayProjectDetail["sessions"][number]) => {
    const ids = getSessionIds(session)
    if (ids.length === 0) return

    const date = new Date(session.start)
    const timeRange = `${new Date(session.start).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} – ${new Date(session.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`

    let description = `${formatSessionType(session.type)} session`
    if (session.file) {
      description = session.file
    } else if (session.meetingTitle || session.host) {
      description = session.meetingTitle || session.host || description
    } else if (session.url) {
      description = session.url
    }

    setSessionPendingDelete({
      ids,
      description: `${description} • ${timeRange}`,
    })
  }

  const handleDeleteSession = async () => {
    if (!sessionPendingDelete || sessionDeletePending) return

    const ids = sessionPendingDelete.ids

    try {
      setSessionDeletePending(true)
      await onDeleteSessions(ids)

      const idsToRemove = new Set(ids)
      let shouldCloseDialog = false

      setSelectedCell((prev) => {
        if (!prev) return prev

        const remainingSessions = prev.sessions.filter((item) => {
          const itemIds = getSessionIds(item)
          return !itemIds.some((id) => idsToRemove.has(id))
        })

        if (remainingSessions.length === 0) {
          shouldCloseDialog = true
          return null
        }

        const remainingSeconds = remainingSessions.reduce((total, item) => total + item.duration, 0)

        return {
          ...prev,
          sessions: remainingSessions,
          hours: remainingSeconds / 3600,
        }
      })

      setEditingSession(null)
      setSessionPendingDelete(null)

      if (shouldCloseDialog) {
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("Failed to delete session", error)
    } finally {
      setSessionDeletePending(false)
    }
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
          <div className="rounded-md border dark:border-gray-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left font-semibold bg-gray-50 dark:bg-gray-800">Project</TableHead>
                  {tableData.map((day) => (
                    <TableHead key={day.date} className="text-right font-semibold bg-gray-50 dark:bg-gray-800">
                      {day.day}
                    </TableHead>
                  ))}
                  <TableHead className="text-right font-semibold bg-teal-50 dark:bg-teal-950">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProjects.map((project) => {
                  const wrikeMapping = getWrikeMapping(project)
                  const clientName = getProjectClient(project)
                  return (
                    <TableRow key={project}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorMap[project] }}></div>
                          <div className="flex flex-col">
                            <span>{getProjectDisplayName(project)}</span>
                            {clientName && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{clientName}</span>
                            )}
                          </div>
                          {wrikeMapping && (
                            <a
                              href={wrikeMapping.wrikePermalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-1"
                              title={`Open ${wrikeMapping.wrikeProjectTitle} in Wrike`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      {tableData.map((day) => {
                        const hours = day.projectHours[project] || 0
                        return (
                          <TableCell
                            key={day.date}
                            className={`text-right ${
                              hours > 0 ? "cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950 font-medium" : "text-gray-400 dark:text-gray-600"
                            }`}
                            onClick={() => hours > 0 && handleCellClick(day.day, day.date, project, hours)}
                          >
                            {hours > 0 ? formatHoursForChart(hours) : "-"}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950">
                        {formatHoursForChart(projectTotals[project])}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-700">
                  <TableCell className="font-bold">Total</TableCell>
                  {tableData.map((day) => (
                    <TableCell key={day.date} className="text-right font-bold">
                      {formatHoursForChart(day.totalHours)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold text-teal-900 dark:text-teal-200 bg-teal-100 dark:bg-teal-900">
                    {formatHoursForChart(weeklyTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Session Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
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
                <TabsTrigger value="commits">Commits</TabsTrigger>
              </TabsList>

              {/* Timeline View with 24-hour bar */}
              <TabsContent value="timeline" className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCell.sessions.length} session{selectedCell.sessions.length !== 1 ? "s" : ""}
                </div>

                {/* 24-hour horizontal timeline */}
                <div className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <h4 className="text-sm font-semibold mb-3 dark:text-gray-200">Activity Timeline</h4>
                  <div className="relative h-12 bg-white dark:bg-gray-900 rounded border dark:border-gray-700">
                    {/* Hour markers */}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: 24 }, (_, i) => (
                        <div key={i} className="flex-1 border-r border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 px-1">
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

                        const barColor = getSessionColor(session.type)
                        return (
                          <div
                            key={index}
                            className="absolute h-6 rounded"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              backgroundColor: barColor,
                              opacity: 0.8,
                            }}
                            title={`${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: getSessionColor("coding") }}></div>
                      <span>Coding</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: getSessionColor("browsing") }}></div>
                      <span>Browsing</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: getSessionColor("meeting") }}></div>
                      <span>Meeting</span>
                    </div>
                  </div>
                </div>

                {/* Session list */}
                <div className="space-y-2">
                  {selectedCell.sessions.map((session, index) => {
                    const sessionIds = getSessionIds(session)
                    const isEditing = editingSession?.index === index
                    const disableActions = sessionUpdatePending || sessionDeletePending
                    const canEdit = sessionIds.length > 0
                    const availableProjects = Array.from(
                      new Set([selectedCell.project, ...allProjects].filter(Boolean)),
                    ) as string[]

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-2 pt-1">
                          {session.type === "coding" ? (
                            <Code className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          ) : session.type === "meeting" ? (
                            <Video className="w-4 h-4 text-violet-500 dark:text-violet-300" />
                          ) : (
                            <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                session.type === "coding"
                                  ? "default"
                                  : session.type === "meeting"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {formatSessionType(session.type)}
                            </Badge>
                            <div className="text-sm font-medium dark:text-gray-200">
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
                          {session.file && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={session.file}>
                              <FileText className="w-3 h-3 inline mr-1" />
                              {session.file}
                            </div>
                          )}
                          {session.type === "meeting" ? (
                            <div className="text-sm text-violet-600 dark:text-violet-300 flex items-center gap-1 truncate">
                              <Video className="w-3 h-3" />
                              {session.meetingTitle || session.host || "Meeting"}
                              {session.url && (
                                <a
                                  href={session.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-violet-500 dark:text-violet-200 hover:text-violet-700 dark:hover:text-violet-100 flex items-center gap-1"
                                  title={session.url}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : session.url ? (
                            <a
                              href={session.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 truncate"
                              title={session.url}
                            >
                              <Globe className="w-3 h-3" />
                              {session.host || new URL(session.url).hostname}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2 min-w-[180px]">
                          <div className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatHoursForChart(session.duration / 3600)}
                          </div>
                          {canEdit ? (
                            <div className="flex gap-2">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={editingSession?.selectedProject ?? selectedCell.project}
                                    onValueChange={handleProjectSelectionChange}
                                    disabled={disableActions}
                                  >
                                    <SelectTrigger className="w-44 h-6 text-left">
                                      <SelectValue placeholder="Select project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableProjects.map((projectName) => (
                                        <SelectItem key={projectName} value={projectName}>
                                          {getProjectDisplayName(projectName)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="xs"
                                    onClick={handleConfirmProjectChange}
                                    disabled={
                                      disableActions ||
                                      !editingSession ||
                                      !editingSession.selectedProject ||
                                      editingSession.selectedProject === editingSession.currentProject
                                    }
                                  >
                                    {sessionUpdatePending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={handleCancelEditingSession}
                                    disabled={disableActions}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="flex items-center gap-1"
                                  onClick={() => handleStartEditingSession(session, index)}
                                  disabled={disableActions}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="xs"
                                className="flex items-center gap-1"
                                onClick={() => requestDeleteSession(session)}
                                disabled={disableActions}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Cannot edit</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
                      <div key={index} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg dark:bg-gray-800">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                          <span className="text-sm dark:text-gray-200 truncate" title={item.file}>
                            {item.file}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span>{item.sessions} session{item.sessions !== 1 ? "s" : ""}</span>
                          <span className="font-medium">{formatHoursForChart(item.duration / 3600)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">No files recorded</div>
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
                      <div key={index} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg dark:bg-gray-800">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate flex items-center gap-1"
                            title={item.url}
                          >
                            {item.host}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span>{item.sessions} session{item.sessions !== 1 ? "s" : ""}</span>
                          <span className="font-medium">{formatHoursForChart(item.duration / 3600)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">No websites recorded</div>
                  )
                })()}
              </TabsContent>

              {/* Commits Tab */}
              <TabsContent value="commits" className="space-y-2">
                {(() => {
                  // Filter commits for the selected day and project
                  const dayCommits = commits.filter((commit) => {
                    const commitDate = new Date(commit.commitTime).toISOString().split("T")[0]
                    return commitDate === selectedCell.date && commit.project === selectedCell.project
                  }).sort((a, b) => new Date(b.commitTime).getTime() - new Date(a.commitTime).getTime())

                  return dayCommits.length > 0 ? (
                    <>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {dayCommits.length} commit{dayCommits.length !== 1 ? "s" : ""}
                      </div>
                      {dayCommits.map((commit, index) => (
                        <div key={index} className="p-3 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-2">
                          <div className="flex items-start gap-3">
                            <GitCommit className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs font-mono bg-gray-200 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded">
                                  {commit.commitHash.substring(0, 7)}
                                </code>
                                {commit.branch && (
                                  <Badge variant="outline" className="text-xs">
                                    {commit.branch}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(commit.commitTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">{commit.commitMessage}</div>
                              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                {commit.authorName && (
                                  <span>
                                    <strong>Author:</strong> {commit.authorName}
                                  </span>
                                )}
                                {commit.filesChanged > 0 && (
                                  <span>
                                    <strong>Files:</strong> {commit.filesChanged}
                                  </span>
                                )}
                                {(commit.linesAdded > 0 || commit.linesDeleted > 0) && (
                                  <span>
                                    <span className="text-green-600 dark:text-green-400">+{commit.linesAdded}</span> /{" "}
                                    <span className="text-red-600 dark:text-red-400">-{commit.linesDeleted}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">No commits recorded for this day</div>
                  )
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={sessionPendingDelete !== null} onOpenChange={(open) => !open && !sessionDeletePending && setSessionPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              {sessionPendingDelete?.description && (
                <span className="block text-sm text-gray-600 dark:text-gray-300">{sessionPendingDelete.description}</span>
              )}
              <span className="block mt-3 text-sm text-gray-600 dark:text-gray-300">
                This action permanently removes the tracked time and cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sessionDeletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={sessionDeletePending}
            >
              {sessionDeletePending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
