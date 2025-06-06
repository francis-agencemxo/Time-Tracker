"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Clock, Code, Globe, ArrowLeft } from "lucide-react"
import type { StatsData, Session } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectDetailViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  selectedProject?: string
  onBack: () => void
}

export function ProjectDetailView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  selectedProject: initialProject,
  onBack,
}: ProjectDetailViewProps) {
  const [selectedProject, setSelectedProject] = useState<string>(initialProject || "")
  const [expandedSessions, setExpandedSessions] = useState<{ [key: string]: boolean }>({})

  const {
    getProjectTotals,
    getProjectBreakdown,
    getDailyTotalsForProject,
    getProjectChartData,
    formatDuration,
    formatHoursForChart,
    getWeeklyDataForProject,
    getProjectSessionDetails,
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)

  const allProjects = getProjectTotals()
  const projectColors = getProjectChartData()

  // Auto-select first project if none selected
  if (!selectedProject && allProjects.length > 0) {
    setSelectedProject(allProjects[0].name)
  }

  if (!selectedProject) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <div>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>No projects found for the selected week</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  const projectData = allProjects.find((p) => p.name === selectedProject)
  const projectColor = projectColors.find((p) => p.name === selectedProject)?.color || "#2D5A5A"
  const dailyTotals = getDailyTotalsForProject(selectedProject)
  const weeklyData = getWeeklyDataForProject(selectedProject)
  const sessionDetails = getProjectSessionDetails(selectedProject)

  const toggleSessionExpansion = (sessionId: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }))
  }

  // Custom tooltip formatter for charts
  const customTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value)
    return [formatHoursForChart(numValue), name]
  }

  // Generate fake file paths and URLs for demo
  const generateSessionDetails = (session: Session, index: number) => {
    const filePaths = [
      "/src/components/dashboard/ProjectView.tsx",
      "/src/hooks/useTimeCalculations.ts",
      "/src/lib/dateUtils.ts",
      "/src/pages/api/stats.ts",
      "/src/components/ui/Chart.tsx",
      "/src/styles/globals.css",
      "/src/utils/sessionMerger.ts",
      "/README.md",
      "/package.json",
    ]

    const urls = [
      "https://github.com/company/project/pull/123",
      "https://stackoverflow.com/questions/react-hooks",
      "https://docs.company.com/api-reference",
      "https://figma.com/design/dashboard-v2",
      "https://jira.company.com/browse/PROJ-456",
      "https://confluence.company.com/project-docs",
      "https://npmjs.com/package/recharts",
      "https://tailwindcss.com/docs",
    ]

    if (session.type === "coding") {
      return {
        files: filePaths.slice(0, Math.floor(Math.random() * 4) + 1),
        urls: [],
      }
    } else {
      return {
        files: [],
        urls: urls.slice(0, Math.floor(Math.random() * 3) + 1),
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button and Project Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Projects
              </Button>
              <div>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: projectColor }} />
                  Project Details
                </CardTitle>
                <CardDescription>Detailed analytics and session information</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {allProjects.map((project) => (
                    <SelectItem key={project.name} value={project.name}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: projectColors.find((p) => p.name === project.name)?.color || "#2D5A5A",
                          }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Project Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">{formatHoursForChart(projectData?.hours || 0)}</div>
            <p className="text-sm text-gray-600">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">{sessionDetails.length}</div>
            <p className="text-sm text-gray-600">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">
              {sessionDetails.filter((s) => s.type === "coding").length}
            </div>
            <p className="text-sm text-gray-600">Coding Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-teal-800">
              {sessionDetails.filter((s) => s.type === "browsing").length}
            </div>
            <p className="text-sm text-gray-600">Research Sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Details */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Hours</CardTitle>
            <CardDescription>Hours worked per day this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                hours: {
                  label: "Hours",
                  color: projectColor,
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
                  <Bar dataKey="hours" fill={projectColor} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>Cumulative hours throughout the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                cumulative: {
                  label: "Cumulative Hours",
                  color: projectColor,
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={weeklyData.map((item, index) => ({
                    ...item,
                    cumulative: weeklyData.slice(0, index + 1).reduce((sum, day) => sum + day.hours, 0),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
                  <Line type="monotone" dataKey="cumulative" stroke={projectColor} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Session Details */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>Detailed breakdown of all sessions for {selectedProject}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessionDetails.map((session, index) => {
              const sessionId = `${session.start}-${index}`
              const isExpanded = expandedSessions[sessionId]
              const duration = (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000
              const details = generateSessionDetails(session, index)

              return (
                <Collapsible key={sessionId}>
                  <CollapsibleTrigger onClick={() => toggleSessionExpansion(sessionId)} className="w-full">
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <div
                            className={`w-3 h-3 rounded-full ${
                              session.type === "coding" ? "bg-teal-500" : "bg-amber-500"
                            }`}
                          />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <Badge variant={session.type === "coding" ? "default" : "secondary"}>
                              {session.type === "coding" ? (
                                <Code className="w-3 h-3 mr-1" />
                              ) : (
                                <Globe className="w-3 h-3 mr-1" />
                              )}
                              {session.type}
                            </Badge>
                            <span className="font-medium">
                              {new Date(session.start).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
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
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{formatDuration(duration)}</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div
                      className="ml-8 mr-4 mb-4 p-4 bg-gray-50 rounded-lg border-l-4"
                      style={{ borderLeftColor: projectColor }}
                    >
                      {session.type === "coding" && details.files.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            Files Worked On
                          </h5>
                          <div className="space-y-1">
                            {details.files.map((file, fileIndex) => (
                              <div
                                key={fileIndex}
                                className="text-sm font-mono text-gray-700 bg-white px-2 py-1 rounded border"
                              >
                                {file}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {session.type === "browsing" && details.urls.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            URLs Browsed
                          </h5>
                          <div className="space-y-1">
                            {details.urls.map((url, urlIndex) => (
                              <div key={urlIndex} className="text-sm">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-600 hover:text-teal-800 underline bg-white px-2 py-1 rounded border block"
                                >
                                  {url}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {details.files.length === 0 && details.urls.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No detailed activity data available</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
