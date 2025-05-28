"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"

import { Clock, Calendar, TrendingUp, Users, FolderOpen, RefreshCw } from "lucide-react"

// Types for the API data
interface Session {
  start: string
  end: string
  type: "coding" | "browsing"
}

interface ProjectData {
  duration: number
  sessions: Session[]
}

interface DayData {
  [projectName: string]: ProjectData
}

interface StatsData {
  [date: string]: DayData
}

export default function TimeTrackingDashboard() {
  const [statsData, setStatsData] = useState<StatsData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from local API
  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("http://localhost:56000/api/stats")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setStatsData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      console.error("Error fetching stats:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Helper functions to process the data
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const mergeSessions = (sessions: Session[]): Session[] => {
    if (sessions.length === 0) return sessions

    const sortedSessions = [...sessions].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    const mergedSessions: Session[] = []
    let currentSession = { ...sortedSessions[0] }

    for (let i = 1; i < sortedSessions.length; i++) {
      const session = sortedSessions[i]
      const currentEnd = new Date(currentSession.end).getTime()
      const sessionStart = new Date(session.start).getTime()
      const timeDiff = sessionStart - currentEnd

      // If sessions are within 5 minutes (300000 ms) and same type, merge them
      if (timeDiff <= 300000 && currentSession.type === session.type) {
        currentSession.end = session.end
      } else {
        mergedSessions.push(currentSession)
        currentSession = { ...session }
      }
    }

    mergedSessions.push(currentSession)
    return mergedSessions
  }

  const getProjectTotals = () => {
    const projectTotals: { [key: string]: number } = {}

    Object.values(statsData).forEach((dayData) => {
      Object.entries(dayData).forEach(([projectName, projectData]) => {
        projectTotals[projectName] = (projectTotals[projectName] || 0) + projectData.duration
      })
    })

    return Object.entries(projectTotals)
      .map(([name, duration]) => ({ name, duration, hours: duration / 3600 }))
      .sort((a, b) => b.duration - a.duration)
  }

  const getWeeklyData = () => {
    const last7Days = Object.keys(statsData).sort().slice(-7)

    return last7Days.map((date) => {
      const dayData = statsData[date]
      const totalSeconds = Object.values(dayData).reduce((sum, project) => sum + project.duration, 0)
      const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" })

      return {
        day: dayName,
        date,
        hours: totalSeconds / 3600,
        target: (dayName != "Sat" && dayName != "Sun" ) ? 8 : 0,
      }
    })
  }

  const getRecentActivities = () => {
    const activities: Array<{
      id: string
      project: string
      task: string
      duration: string
      status: string
      date: string
      type: string
    }> = []

    // Get last 10 sessions across all projects and dates
    Object.entries(statsData)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort dates descending
      .slice(0, 3) // Last 3 days
      .forEach(([date, dayData]) => {
        Object.entries(dayData).forEach(([projectName, projectData]) => {
          const mergedSessions = mergeSessions(projectData.sessions)
          mergedSessions
            .slice(-3) // Last 3 merged sessions per project per day
            .forEach((session, index) => {
              const duration = new Date(session.end).getTime() - new Date(session.start).getTime()
              activities.push({
                id: `${date}-${projectName}-${index}`,
                project: projectName,
                task: `${session.type} session`,
                duration: formatDuration(duration / 1000),
                status: "completed",
                date,
                type: session.type,
              })
            })
        })
      })

    return activities.slice(0, 10) // Return top 10
  }

  const getTotalHoursThisWeek = () => {
    const weeklyData = getWeeklyData()
    return weeklyData.reduce((sum, day) => sum + day.hours, 0)
  }

  const getAvgHoursPerDay = () => {
    const weeklyData = getWeeklyData()
    return weeklyData.length > 0 ? getTotalHoursThisWeek() / weeklyData.length : 0
  }

  const getActiveProjects = () => {
    return getProjectTotals().length
  }

  const getCompletedTasks = () => {
    return getRecentActivities().filter((activity) => activity.status === "completed").length
  }

  const getProjectChartData = () => {
    const projects = getProjectTotals().slice(0, 5) // Top 5 projects
    const colors = ["#2D5A5A", "#4A7C7C", "#A67C5A", "#8B4513", "#D2B48C"]

    return projects.map((project, index) => ({
      name: project.name,
      hours: Number(project.hours.toFixed(1)),
      color: colors[index % colors.length],
    }))
  }

  const getMonthlyTrend = () => {
    const monthlyData: { [key: string]: number } = {}

    Object.entries(statsData).forEach(([date, dayData]) => {
      const month = new Date(date).toLocaleDateString("en-US", { month: "short" })
      const totalSeconds = Object.values(dayData).reduce((sum, project) => sum + project.duration, 0)
      monthlyData[month] = (monthlyData[month] || 0) + totalSeconds
    })

    return Object.entries(monthlyData).map(([month, seconds]) => ({
      month,
      hours: Number((seconds / 3600).toFixed(1)),
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading time tracking data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const totalHours = getTotalHoursThisWeek()
  const avgHoursPerDay = getAvgHoursPerDay()
  const activeProjects = getActiveProjects()
  const completedTasks = getCompletedTasks()
  const weeklyData = getWeeklyData()
  const projectData = getProjectChartData()
  const monthlyTrend = getMonthlyTrend()
  const recentActivities = getRecentActivities()
  const allProjects = getProjectTotals()

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/mxo-logo.png" alt="MXO Logo" className="h-12 w-auto" />
            <div>
              <h1 className="text-3xl font-bold text-teal-800">Development Time Tracking</h1>
              <p className="text-gray-600 mt-1">Monitor your development productivity and project progress</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchStats}
              variant="outline"
              size="sm"
              className="border-teal-200 text-teal-700 hover:bg-teal-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Badge variant="outline" className="px-3 py-1">
              <Calendar className="w-4 h-4 mr-1" />
              Live Data
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours This Week</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Across {weeklyData.length} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per Day</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgHoursPerDay.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Target: 8h per day</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects}</div>
              <p className="text-xs text-muted-foreground">{allProjects[0]?.name || "No projects"} is top project</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}</div>
              <p className="text-xs text-muted-foreground">Last 3 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList>
            <TabsTrigger value="weekly">Weekly View</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Hours This Week</CardTitle>
                  <CardDescription>Hours worked vs target hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      hours: {
                        label: "Hours Worked",
                        color: "#8884d8",
                      },
                      target: {
                        label: "Target Hours",
                        color: "#82ca9d",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="hours" fill="#2D5A5A" name="Hours Worked" />
                        <Bar dataKey="target" fill="#4A7C7C" name="Target Hours" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Weekly Progress</CardTitle>
                  <CardDescription>Cumulative hours throughout the week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      cumulative: {
                        label: "Cumulative Hours",
                        color: "#8884d8",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={weeklyData.map((item, index) => ({
                          ...item,
                          cumulative: weeklyData.slice(0, index + 1).reduce((sum, day) => sum + day.hours, 0),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="cumulative" stroke="#2D5A5A" fill="#2D5A5A" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time by Project</CardTitle>
                  <CardDescription>Hours spent on each project</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      hours: {
                        label: "Hours",
                        color: "#8884d8",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="hours"
                          label={({ name, hours }) => `${name}: ${hours}h`}
                        >
                          {projectData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Project Hours Breakdown</CardTitle>
                  <CardDescription>Detailed view of time allocation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allProjects.slice(0, 8).map((project, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: projectData.find((p) => p.name === project.name)?.color || "#8884d8",
                            }}
                          />
                          <span className="font-medium">{project.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{project.hours.toFixed(1)}h</div>
                          <div className="text-sm text-gray-500">
                            {((project.duration / allProjects.reduce((sum, p) => sum + p.duration, 0)) * 100).toFixed(
                              1,
                            )}
                            %
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>Hours worked over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    hours: {
                      label: "Hours",
                      color: "#8884d8",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="hours" stroke="#2D5A5A" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Your latest time entries and sessions</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${activity.type === "coding" ? "bg-teal-600" : "bg-amber-600"}`}
                    />
                    <div>
                      <div className="font-medium">{activity.task}</div>
                      <div className="text-sm text-gray-500">{activity.project}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={activity.type === "coding" ? "default" : "secondary"}>{activity.type}</Badge>
                    <div className="text-right">
                      <div className="font-medium">{activity.duration}</div>
                      <div className="text-sm text-gray-500">{activity.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
