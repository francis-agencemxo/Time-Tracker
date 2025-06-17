"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, ChevronRight, Clock, Code, Globe, ArrowLeft, FileText } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { ActivityBreakdownView } from "./activity-breakdown-view"

interface ProjectUrl {
  project: string
  url: string
}

interface ProjectDetailViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[] // Add this prop
  selectedProject?: string
  projectUrls?: ProjectUrl[]
  onBack: () => void
}

export function ProjectDetailView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [], // Add default value
  selectedProject: initialProject,
  projectUrls = [],
  onBack,
}: ProjectDetailViewProps) {
  const [selectedProject, setSelectedProject] = useState<string>(initialProject || "")
  const [expandedSessions, setExpandedSessions] = useState<{ [key: string]: boolean }>({})
  const [activeTab, setActiveTab] = useState<string>("overview")

  const {
    getProjectTotals,
    getProjectBreakdown,
    getDailyTotalsForProject,
    getProjectChartData,
    formatDuration,
    formatHoursForChart,
    getWeeklyDataForProject,
    getProjectSessionDetails,
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes, ignoredProjects)

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

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">
            <FileText className="w-4 h-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files">
          <ActivityBreakdownView
            statsData={statsData}
            currentWeek={currentWeek}
            idleTimeoutMinutes={idleTimeoutMinutes}
            selectedProject={selectedProject}
          />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>Detailed breakdown of all sessions for {selectedProject}</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionDetails.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No session data available for this project.</div>
              ) : (
                <div className="space-y-4">
                  {/* Group sessions by date for better organization */}
                  {Object.entries(
                    sessionDetails.reduce(
                      (acc, session) => {
                        // Get date part only for grouping
                        const date = new Date(session.start).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                        if (!acc[date]) acc[date] = []
                        acc[date].push(session)
                        return acc
                      },
                      {} as Record<string, typeof sessionDetails>,
                    ),
                  )
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([date, dateSessions]) => {
                      // Group sessions by proximity (ignoring type) based on idle timeout
                      const groupedSessions: Array<{
                        sessions: typeof sessionDetails
                        start: string
                        end: string
                        primaryType: "coding" | "browsing"
                        codingSessions: number
                        browsingSessions: number
                      }> = []

                      // Sort sessions by start time
                      const sortedSessions = [...dateSessions].sort(
                        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
                      )

                      // Group sessions based on idle timeout (ignoring type)
                      let currentGroup: (typeof groupedSessions)[0] | null = null

                      sortedSessions.forEach((session) => {
                        if (
                          !currentGroup ||
                          new Date(session.start).getTime() - new Date(currentGroup.end).getTime() >
                            idleTimeoutMinutes * 60 * 1000
                        ) {
                          // Start a new group
                          currentGroup = {
                            sessions: [session],
                            start: session.start,
                            end: session.end,
                            primaryType: session.type,
                            codingSessions: session.type === "coding" ? 1 : 0,
                            browsingSessions: session.type === "browsing" ? 1 : 0,
                          }
                          groupedSessions.push(currentGroup)
                        } else {
                          // Add to current group
                          currentGroup.sessions.push(session)
                          currentGroup.end = session.end

                          // Update session counts
                          if (session.type === "coding") {
                            currentGroup.codingSessions++
                          } else {
                            currentGroup.browsingSessions++
                          }

                          // Update primary type based on which type has more sessions
                          currentGroup.primaryType =
                            currentGroup.codingSessions >= currentGroup.browsingSessions ? "coding" : "browsing"
                        }
                      })

                      return (
                        <div key={date} className="space-y-3">
                          <h3 className="font-medium text-gray-700">{date}</h3>
                          {groupedSessions.map((group, groupIndex) => {
                            const sessionId = `${group.start}-${groupIndex}`
                            const isExpanded = expandedSessions[sessionId]
                            const duration = (new Date(group.end).getTime() - new Date(group.start).getTime()) / 1000
                            const sessionCount = group.sessions.length
                            const hasMixedTypes = group.codingSessions > 0 && group.browsingSessions > 0

                            return (
                              <Collapsible key={sessionId}>
                                <CollapsibleTrigger
                                  onClick={() => toggleSessionExpansion(sessionId)}
                                  className="w-full"
                                >
                                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                        <div
                                          className={`w-3 h-3 rounded-full ${
                                            group.primaryType === "coding" ? "bg-teal-500" : "bg-amber-500"
                                          }`}
                                        />
                                      </div>
                                      <div className="text-left">
                                        <div className="flex items-center gap-2">
                                          <Badge variant={group.primaryType === "coding" ? "default" : "secondary"}>
                                            {group.primaryType === "coding" ? (
                                              <Code className="w-3 h-3 mr-1" />
                                            ) : (
                                              <Globe className="w-3 h-3 mr-1" />
                                            )}
                                            {hasMixedTypes ? "Mixed Session" : group.primaryType}
                                            {sessionCount > 1 && <span className="ml-1 text-xs">({sessionCount})</span>}
                                          </Badge>
                                          {hasMixedTypes && (
                                            <div className="flex gap-1">
                                              <Badge variant="outline" className="text-xs">
                                                <Code className="w-2 h-2 mr-1" />
                                                {group.codingSessions}
                                              </Badge>
                                              <Badge variant="outline" className="text-xs">
                                                <Globe className="w-2 h-2 mr-1" />
                                                {group.browsingSessions}
                                              </Badge>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {new Date(group.start).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}{" "}
                                          -{" "}
                                          {new Date(group.end).toLocaleTimeString([], {
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
                                    {/* Show session summary */}
                                    <div>
                                      <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                                        {hasMixedTypes ? (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Code className="w-4 h-4" />
                                              <Globe className="w-4 h-4" />
                                            </div>
                                            Work Session
                                          </>
                                        ) : group.primaryType === "coding" ? (
                                          <>
                                            <Code className="w-4 h-4" />
                                            Development Session
                                          </>
                                        ) : (
                                          <>
                                            <Globe className="w-4 h-4" />
                                            Browsing Session
                                          </>
                                        )}
                                      </h5>
                                      <p className="text-sm text-gray-600 bg-white px-3 py-2 rounded border">
                                        {hasMixedTypes ? (
                                          <>
                                            Work session with {group.codingSessions} coding and {group.browsingSessions}{" "}
                                            browsing activities
                                            <br />
                                            From{" "}
                                            {new Date(group.start).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}{" "}
                                            to{" "}
                                            {new Date(group.end).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                            <br />
                                            Total duration: {formatDuration(duration)}
                                          </>
                                        ) : sessionCount > 1 ? (
                                          <>
                                            Combined {sessionCount} {group.primaryType} sessions from{" "}
                                            {new Date(group.start).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}{" "}
                                            to{" "}
                                            {new Date(group.end).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                            <br />
                                            Total duration: {formatDuration(duration)}
                                          </>
                                        ) : (
                                          <>
                                            {group.primaryType === "coding" ? "Coding" : "Browsing"} session from{" "}
                                            {new Date(group.start).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}{" "}
                                            to{" "}
                                            {new Date(group.end).toLocaleTimeString([], {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                            <br />
                                            Duration: {formatDuration(duration)}
                                          </>
                                        )}
                                      </p>
                                    </div>

                                    {/* Show project URLs for browsing sessions */}
                                    {group.browsingSessions > 0 && (
                                      <div className="mt-3">
                                        {(projectUrls || []).filter((url) => url.project === selectedProject).length >
                                        0 ? (
                                          <div>
                                            <h6 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                                              <Globe className="w-3 h-3" />
                                              Project URLs:
                                            </h6>
                                            <div className="space-y-1">
                                              {(projectUrls || [])
                                                .filter((url) => url.project === selectedProject)
                                                .map((projectUrl, urlIndex) => (
                                                  <div key={urlIndex} className="text-sm">
                                                    <a
                                                      href={projectUrl.url}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-teal-600 hover:text-teal-800 underline bg-white px-2 py-1 rounded border block"
                                                    >
                                                      {projectUrl.url}
                                                    </a>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-500 italic">
                                            No project URLs configured for browsing session details
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Show individual sessions if there are multiple */}
                                    {sessionCount > 1 && (
                                      <div className="mt-3">
                                        <h6 className="text-xs font-medium text-gray-500 mb-2">Individual Sessions:</h6>
                                        <div className="space-y-1 text-xs">
                                          {group.sessions.map((session, idx) => {
                                            const sessionDuration =
                                              (new Date(session.end).getTime() - new Date(session.start).getTime()) /
                                              1000
                                            return (
                                              <div
                                                key={idx}
                                                className="flex justify-between items-center px-2 py-1 bg-white rounded border"
                                              >
                                                <div className="flex items-center gap-2">
                                                  <div
                                                    className={`w-2 h-2 rounded-full ${
                                                      session.type === "coding" ? "bg-teal-500" : "bg-amber-500"
                                                    }`}
                                                  />
                                                  <span>
                                                    {new Date(session.start).toLocaleTimeString([], {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    })}{" "}
                                                    -{" "}
                                                    {new Date(session.end).toLocaleTimeString([], {
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    })}
                                                  </span>
                                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                                    {session.type}
                                                  </Badge>
                                                </div>
                                                <span className="text-gray-600">{formatDuration(sessionDuration)}</span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )
                          })}
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
