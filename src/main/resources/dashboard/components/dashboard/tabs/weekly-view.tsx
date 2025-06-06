import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { ProjectHoursBreakdown } from "@/components/dashboard/project-hours-breakdown"

interface WeeklyViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  onProjectSelect?: (projectName: string) => void
}

export function WeeklyView({ statsData, currentWeek, idleTimeoutMinutes, onProjectSelect }: WeeklyViewProps) {
  const { getStackedWeeklyData, getProjectChartData, formatHoursForChart } = useTimeCalculations(
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
      return [formatHoursForChart(numValue), " - Target Hours"]
    }
    return [formatHoursForChart(numValue), " - "+name]
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Daily Hours This Week</CardTitle>
          <CardDescription>Hours worked by project vs target hours</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ChartContainer config={chartConfig} className="h-[300px]">
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
        </CardContent>
      </Card>

      {/* Project Hours Breakdown - now in 50/50 layout */}
      <ProjectHoursBreakdown
        statsData={statsData}
        currentWeek={currentWeek}
        idleTimeoutMinutes={idleTimeoutMinutes}
        onProjectSelect={onProjectSelect}
        limit={8} // Increased limit since we have more space
      />
    </div>
  )
}
