import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectsViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
}

export function ProjectsView({ statsData, currentWeek, idleTimeoutMinutes }: ProjectsViewProps) {
  const { getProjectChartData, getProjectTotals } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)
  const projectData = getProjectChartData()
  const allProjects = getProjectTotals()

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
                    {((project.duration / allProjects.reduce((sum, p) => sum + p.duration, 0)) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
