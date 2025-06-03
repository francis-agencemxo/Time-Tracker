import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface WeeklyViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
}

export function WeeklyView({ statsData, currentWeek, idleTimeoutMinutes }: WeeklyViewProps) {
  const { getWeeklyData } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)
  const weeklyData = getWeeklyData()

  return (
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
  )
}
