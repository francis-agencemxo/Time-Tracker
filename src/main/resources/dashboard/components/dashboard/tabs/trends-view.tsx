"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, TrendingUp, Clock, Code, Target, Award, Zap } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { createESTDate } from "@/lib/date-utils"

interface TrendsViewProps {
  statsData: StatsData
  idleTimeoutMinutes: number
  ignoredProjects?: string[]
}

export function TrendsView({ statsData, idleTimeoutMinutes, ignoredProjects = [] }: TrendsViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"30d" | "90d" | "1y">("90d")
  const [selectedMetric, setSelectedMetric] = useState<"hours" | "sessions" | "projects">("hours")

  const { getMonthlyTrend, formatHoursForChart, formatDuration, dateToESTString } = useTimeCalculations(
    statsData,
    new Date(),
    idleTimeoutMinutes,
    ignoredProjects,
  )

  // Generate activity heatmap data (GitHub-style)
  const generateActivityHeatmap = () => {
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(today.getFullYear() - 1)

    const heatmapData: Array<{
      date: string
      hours: number
      level: number
      dayOfWeek: number
      week: number
    }> = []

    // Generate data for the last year
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = dateToESTString(d)
      const dayData = statsData[dateStr] || {}

      // Calculate total hours for this day
      let totalHours = 0
      Object.values(dayData).forEach((projectData) => {
        totalHours += projectData.duration / 3600
      })

      // Determine activity level (0-4)
      let level = 0
      if (totalHours > 0.5) level = 1
      if (totalHours > 2) level = 2
      if (totalHours > 4) level = 3
      if (totalHours > 6) level = 4

      const dayOfWeek = d.getDay()
      const weekNumber = Math.floor((d.getTime() - oneYearAgo.getTime()) / (7 * 24 * 60 * 60 * 1000))

      heatmapData.push({
        date: dateStr,
        hours: totalHours,
        level,
        dayOfWeek,
        week: weekNumber,
      })
    }

    return heatmapData
  }

  // Calculate yearly statistics
  const calculateYearlyStats = () => {
    const currentYear = new Date().getFullYear()
    let totalHours = 0
    let totalSessions = 0
    let activeDays = 0
    const projectHours: { [key: string]: number } = {}
    const languageHours: { [key: string]: number } = {}

    Object.entries(statsData).forEach(([dateStr, dayData]) => {
      const date = createESTDate(dateStr)
      if (date.getFullYear() === currentYear) {
        let dayHours = 0
        let daySessions = 0

        Object.entries(dayData).forEach(([projectName, projectData]) => {
          const hours = projectData.duration / 3600
          dayHours += hours
          daySessions += projectData.sessions.length

          projectHours[projectName] = (projectHours[projectName] || 0) + hours

          // Extract language from file extensions
          projectData.sessions.forEach((session) => {
            if (session.file) {
              const extension = session.file.split(".").pop()?.toLowerCase()
              if (extension) {
                const language = getLanguageFromExtension(extension)
                const sessionHours =
                  (new Date(session.end).getTime() - new Date(session.start).getTime()) / (1000 * 3600)
                languageHours[language] = (languageHours[language] || 0) + sessionHours
              }
            }
          })
        })

        totalHours += dayHours
        totalSessions += daySessions
        if (dayHours > 0) activeDays++
      }
    })

    const avgHoursPerDay = activeDays > 0 ? totalHours / activeDays : 0
    const avgHoursPerActiveDay = activeDays > 0 ? totalHours / activeDays : 0

    return {
      totalHours,
      totalSessions,
      activeDays,
      avgHoursPerDay: totalHours / 365, // Including inactive days
      avgHoursPerActiveDay,
      topProjects: Object.entries(projectHours)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, hours]) => ({ name, hours })),
      topLanguages: Object.entries(languageHours)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, hours]) => ({ name, hours })),
    }
  }

  // Map file extensions to languages
  const getLanguageFromExtension = (extension: string): string => {
    const languageMap: { [key: string]: string } = {
      ts: "TypeScript",
      tsx: "TypeScript",
      js: "JavaScript",
      jsx: "JavaScript",
      py: "Python",
      java: "Java",
      cpp: "C++",
      c: "C",
      cs: "C#",
      php: "PHP",
      rb: "Ruby",
      go: "Go",
      rs: "Rust",
      swift: "Swift",
      kt: "Kotlin",
      dart: "Dart",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      sass: "SASS",
      less: "LESS",
      json: "JSON",
      xml: "XML",
      yaml: "YAML",
      yml: "YAML",
      md: "Markdown",
      sql: "SQL",
      sh: "Shell",
      bash: "Bash",
      zsh: "Zsh",
      fish: "Fish",
    }
    return languageMap[extension] || extension.toUpperCase()
  }

  // Generate weekly trend data
  const generateWeeklyTrend = () => {
    const weeks: { [key: string]: number } = {}

    Object.entries(statsData).forEach(([dateStr, dayData]) => {
      const date = createESTDate(dateStr)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = dateToESTString(weekStart)

      let dayHours = 0
      Object.values(dayData).forEach((projectData) => {
        dayHours += projectData.duration / 3600
      })

      weeks[weekKey] = (weeks[weekKey] || 0) + dayHours
    })

    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 weeks
      .map(([week, hours]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        hours: Number(hours.toFixed(1)),
      }))
  }

  const heatmapData = generateActivityHeatmap()
  const yearlyStats = calculateYearlyStats()
  const weeklyTrend = generateWeeklyTrend()
  const monthlyTrend = getMonthlyTrend()

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value)
    return [formatHoursForChart(numValue), name]
  }

  // Activity level colors
  const getActivityColor = (level: number) => {
    const colors = [
      "bg-gray-100", // 0 - no activity
      "bg-green-200", // 1 - low activity
      "bg-green-400", // 2 - medium activity
      "bg-green-600", // 3 - high activity
      "bg-green-800", // 4 - very high activity
    ]
    return colors[level] || colors[0]
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" />
              Development Insights
            </CardTitle>
            <CardDescription>Comprehensive analytics and trends for your development activity</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={(value: "30d" | "90d" | "1y") => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity Heatmap
          </CardTitle>
          <CardDescription>Your coding activity over the past year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Day labels */}
                <div className="flex mb-2">
                  <div className="w-8"></div>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                    <div key={i} className="w-3 h-3 text-xs text-gray-500 flex items-center justify-center mr-1">
                      {i % 2 === 1 ? day.charAt(0) : ""}
                    </div>
                  ))}
                </div>

                {/* Heatmap */}
                <div className="flex">
                  {/* Week numbers could go here */}
                  <div className="w-8"></div>

                  {/* Group by weeks */}
                  <div className="flex gap-1">
                    {Array.from({ length: 53 }, (_, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                          const dayData = heatmapData.find((d) => d.week === weekIndex && d.dayOfWeek === dayOfWeek)
                          return (
                            <div
                              key={`${weekIndex}-${dayOfWeek}`}
                              className={`w-3 h-3 rounded-sm ${dayData ? getActivityColor(dayData.level) : "bg-gray-100"}`}
                              title={dayData ? `${dayData.date}: ${formatHoursForChart(dayData.hours)}` : "No data"}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Less</span>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className={`w-3 h-3 rounded-sm ${getActivityColor(level)}`} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yearly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatHoursForChart(yearlyStats.totalHours)}</div>
                <p className="text-sm text-gray-600">Total this year</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatHoursForChart(yearlyStats.avgHoursPerActiveDay)}</div>
                <p className="text-sm text-gray-600">Daily average</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{yearlyStats.activeDays}</div>
                <p className="text-sm text-gray-600">Active days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{yearlyStats.totalSessions}</div>
                <p className="text-sm text-gray-600">Total sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>Hours worked over the last 12 weeks</CardDescription>
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
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
                  <Line type="monotone" dataKey="hours" stroke="#2D5A5A" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overview</CardTitle>
            <CardDescription>Hours worked by month</CardDescription>
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
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
                  <Bar dataKey="hours" fill="#2D5A5A" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Top Projects
            </CardTitle>
            <CardDescription>Your most worked-on projects this year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearlyStats.topProjects.map((project, index) => (
                <div key={project.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-teal-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-gray-500">
                        {((project.hours / yearlyStats.totalHours) * 100).toFixed(1)}% of total time
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatHoursForChart(project.hours)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Top Languages
            </CardTitle>
            <CardDescription>Your most used programming languages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearlyStats.topLanguages.map((language, index) => (
                <div key={language.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{language.name}</div>
                      <div className="text-sm text-gray-500">
                        {((language.hours / yearlyStats.totalHours) * 100).toFixed(1)}% of total time
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatHoursForChart(language.hours)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar for Daily Average */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Average Progress</CardTitle>
          <CardDescription>{formatHoursForChart(yearlyStats.avgHoursPerActiveDay)} per active day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>0h</span>
              <span>Target: 8h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (yearlyStats.avgHoursPerActiveDay / 8) * 100)}%`,
                }}
              />
            </div>
            <div className="text-center text-sm text-gray-600">
              {((yearlyStats.avgHoursPerActiveDay / 8) * 100).toFixed(1)}% of daily target
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
