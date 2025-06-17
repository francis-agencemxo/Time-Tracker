"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { Badge } from "@/components/ui/badge"

interface WeeklyViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  onProjectSelect?: (projectName: string) => void
}

export function WeeklyView({ statsData, currentWeek, idleTimeoutMinutes, onProjectSelect }: WeeklyViewProps) {
  const { getStackedWeeklyData, getProjectChartData, formatHoursForChart, formatDuration } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
  )
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
  )

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

  // Calculate daily totals for the detailed table
  const dailyTotals = stackedData.map((day) => {
    const projectHours: { [key: string]: number } = {}
    let totalHours = 0

    // Extract project hours for this day
    Object.entries(day).forEach(([key, value]) => {
      if (!["day", "date", "target"].includes(key)) {
        projectHours[key] = value as number
        totalHours += value as number
      }
    })

    return {
      day: day.day,
      date: day.date,
      target: day.target,
      totalHours,
      projectHours,
      percentOfTarget: day.target > 0 ? (totalHours / day.target) * 100 : 0,
    }
  })

  // Calculate weekly totals for each project
  const projectTotals = allProjects
    .map((project) => {
      const total = stackedData.reduce((sum, day) => sum + ((day[project] as number) || 0), 0)
      return {
        project,
        total,
        color: colorMap[project] || "#8884d8",
      }
    })
    .sort((a, b) => b.total - a.total)

  // Calculate overall weekly total
  const weeklyTotal = projectTotals.reduce((sum, project) => sum + project.total, 0)
  const weeklyTarget = stackedData.reduce((sum, day) => sum + ((day.target as number) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Weekly Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
          <CardDescription>
            {formatHoursForChart(weeklyTotal)} of {formatHoursForChart(weeklyTarget)} target hours (
            {weeklyTarget > 0 ? Math.round((weeklyTotal / weeklyTarget) * 100) : 0}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stacked Bar Chart */}
            <div className="h-[350px]">
              <ChartContainer config={chartConfig} className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
                    <Legend />

                    {/* Target hours bar (background) */}
                    <Bar dataKey="target" fill="var(--color-target)" name="Target Hours" opacity={0.3} />

                    {/* Stacked bars for each project */}
                    {allProjects.map((project) => (
                      <Bar
                        key={project}
                        dataKey={project}
                        stackId="projects"
                        fill={`var(--color-${project.replace(/\s+/g, "-").toLowerCase()})`}
                        name={project}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Project Breakdown */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Project Breakdown</h3>
              <div className="space-y-2">
                {projectTotals.map((project) => (
                  <div
                    key={project.project}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => onProjectSelect && onProjectSelect(project.project)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }}></div>
                      <span className="font-medium">{project.project}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">{formatHoursForChart(project.total)}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round((project.total / weeklyTotal) * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
          <CardDescription>Detailed view of hours by day and project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-gray-600">Day</th>
                  <th className="py-2 px-3 text-right font-medium text-gray-600">Total</th>
                  <th className="py-2 px-3 text-right font-medium text-gray-600">Target</th>
                  <th className="py-2 px-3 text-right font-medium text-gray-600">%</th>
                  <th className="py-2 px-3 text-left font-medium text-gray-600">Projects</th>
                </tr>
              </thead>
              <tbody>
                {dailyTotals.map((day) => (
                  <tr key={day.date} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{day.day}</td>
                    <td className="py-3 px-3 text-right font-medium">{formatHoursForChart(day.totalHours)}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{formatHoursForChart(day.target)}</td>
                    <td className="py-3 px-3 text-right">
                      <Badge
                        variant={day.percentOfTarget >= 100 ? "default" : "outline"}
                        className={`${day.percentOfTarget >= 100 ? "bg-green-600" : "text-gray-600"}`}
                      >
                        {Math.round(day.percentOfTarget)}%
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(day.projectHours)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([project, hours]) => (
                            <div
                              key={project}
                              className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                onProjectSelect && onProjectSelect(project)
                              }}
                              style={{ cursor: onProjectSelect ? "pointer" : "default" }}
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: colorMap[project] || "#8884d8" }}
                              ></div>
                              <span>{project}</span>
                              <span className="font-medium">{formatHoursForChart(hours as number)}</span>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="py-3 px-3 font-bold">Total</td>
                  <td className="py-3 px-3 text-right font-bold">{formatHoursForChart(weeklyTotal)}</td>
                  <td className="py-3 px-3 text-right font-medium">{formatHoursForChart(weeklyTarget)}</td>
                  <td className="py-3 px-3 text-right">
                    <Badge
                      variant={weeklyTotal >= weeklyTarget ? "default" : "outline"}
                      className={`${weeklyTotal >= weeklyTarget ? "bg-green-600" : "text-gray-600"}`}
                    >
                      {weeklyTarget > 0 ? Math.round((weeklyTotal / weeklyTarget) * 100) : 0}%
                    </Badge>
                  </td>
                  <td className="py-3 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
