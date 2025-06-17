"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { ProjectHoursBreakdown } from "@/components/dashboard/project-hours-breakdown"

interface ProjectsViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[] // Add this prop
  onProjectSelect?: (projectName: string) => void
}

export function ProjectsView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [],
  onProjectSelect,
}: ProjectsViewProps) {
  const { getProjectChartData, formatHoursForChart } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
    ignoredProjects,
  )
  const projectData = getProjectChartData()

  // Custom tooltip formatter for pie chart
  const customTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value)
    return [formatHoursForChart(numValue), name]
  }

  return (
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
                  label={({ name, hours }) => `${name}: ${formatHoursForChart(hours)}`}
                >
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Use the extracted component */}
      <ProjectHoursBreakdown
        statsData={statsData}
        currentWeek={currentWeek}
        idleTimeoutMinutes={idleTimeoutMinutes}
        onProjectSelect={onProjectSelect}
      />
    </div>
  )
}
