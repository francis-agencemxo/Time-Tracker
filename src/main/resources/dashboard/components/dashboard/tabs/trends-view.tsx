import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface TrendsViewProps {
  statsData: StatsData
  idleTimeoutMinutes: number
}

export function TrendsView({ statsData, idleTimeoutMinutes }: TrendsViewProps) {
  const { getMonthlyTrend, formatHoursForChart } = useTimeCalculations(statsData, new Date(), idleTimeoutMinutes)
  const monthlyTrend = getMonthlyTrend()

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value)
    return [formatHoursForChart(numValue), name]
  }

  return (
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
              <ChartTooltip content={<ChartTooltipContent />} formatter={customTooltipFormatter} />
              <Line type="monotone" dataKey="hours" stroke="#2D5A5A" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
