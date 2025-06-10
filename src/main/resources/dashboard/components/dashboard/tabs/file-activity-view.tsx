"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Code, FileCode, FileText, Package, File } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface FileActivity {
  filename: string
  extension: string
  totalSeconds: number
  timeByHour: number[]
}

interface FileActivityViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  selectedProject?: string
}

export function FileActivityView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  selectedProject,
}: FileActivityViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [fileFilter, setFileFilter] = useState<string>("")

  const { getProjectSessionDetails, formatDuration, formatHoursForChart } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
  )

  // Get all sessions for the selected project
  const allSessions = selectedProject ? getProjectSessionDetails(selectedProject) : []

  // Get unique dates from sessions
  const uniqueDates = Array.from(
    new Set(
      allSessions.map((session) =>
        new Date(session.start).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      ),
    ),
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // If no date is selected, use the most recent date
  const effectiveDate = selectedDate || uniqueDates[0] || ""

  // Get real file activity data from sessions
  const generateFileActivityData = (): FileActivity[] => {
    // Only process coding sessions that have file data
    const codingSessions = allSessions.filter(
      (session) =>
        session.type === "coding" &&
        session.file &&
        new Date(session.start).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) === effectiveDate,
    )

    if (codingSessions.length === 0) return []

    // Group sessions by file
    const fileGroups: { [filename: string]: any[] } = {}

    codingSessions.forEach((session) => {
      if (session.file) {
        // Extract just the filename from the full path
        const filename = session.file.split("/").pop() || session.file
        if (!fileGroups[filename]) {
          fileGroups[filename] = []
        }
        fileGroups[filename].push(session)
      }
    })

    // Calculate file activity data
    const fileActivityData: FileActivity[] = []

    Object.entries(fileGroups).forEach(([filename, sessions]) => {
      // Get file extension
      const extension = filename.split(".").pop() || ""

      // Calculate total time
      const totalSeconds = sessions.reduce((total, session) => {
        return total + (new Date(session.end).getTime() - new Date(session.start).getTime()) / 1000
      }, 0)

      // Calculate time by hour
      const timeByHour = Array(24).fill(0)

      sessions.forEach((session) => {
        const startTime = new Date(session.start)
        const endTime = new Date(session.end)
        const sessionDuration = (endTime.getTime() - startTime.getTime()) / 1000

        // For simplicity, assign the entire session duration to the start hour
        // In a more sophisticated implementation, you could distribute across multiple hours
        const hour = startTime.getHours()
        timeByHour[hour] += sessionDuration
      })

      fileActivityData.push({
        filename,
        extension,
        totalSeconds,
        timeByHour,
      })
    })

    // Sort by total time descending
    return fileActivityData.sort((a, b) => b.totalSeconds - a.totalSeconds)
  }

  const fileActivityData = generateFileActivityData()

  // Filter files based on search input
  const filteredFiles = fileFilter
    ? fileActivityData.filter((file) => file.filename.toLowerCase().includes(fileFilter.toLowerCase()))
    : fileActivityData

  // Get file icon based on extension
  const getFileIcon = (extension: string) => {
    switch (extension) {
      case "tsx":
      case "ts":
        return <Code className="w-4 h-4 text-blue-500" />
      case "json":
        return <Package className="w-4 h-4 text-yellow-600" />
      case "md":
        return <FileText className="w-4 h-4 text-gray-600" />
      case "css":
        return <FileCode className="w-4 h-4 text-purple-500" />
      default:
        return <File className="w-4 h-4 text-gray-500" />
    }
  }

  // Format hour label (12a, 1a, 2a, etc.)
  const formatHourLabel = (hour: number): string => {
    if (hour === 0 || hour === 24) return "12a"
    if (hour === 12) return "12p"
    return hour < 12 ? `${hour}a` : `${hour - 12}p`
  }

  // Generate hour markers for the timeline
  const hourMarkers = Array.from({ length: 24 }, (_, i) => formatHourLabel(i))

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>File Activity</CardTitle>
          <CardDescription>Time spent on files for {selectedProject}</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={effectiveDate || "Select date"} />
            </SelectTrigger>
            <SelectContent>
              {uniqueDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="text"
            placeholder="Filter files..."
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {fileActivityData.length === 0
              ? "No file activity data available for this date."
              : "No files match your filter criteria."}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Hour markers */}
            <div className="flex border-b mb-2 pl-[200px] text-xs text-gray-500">
              {hourMarkers.map((label, i) => (
                <div key={i} className="flex-1 text-center">
                  {i % 2 === 0 && label}
                </div>
              ))}
            </div>

            {/* File rows */}
            {filteredFiles.map((file, index) => (
              <div key={index} className="flex items-center">
                {/* File info */}
                <div className="w-[200px] flex items-center pr-4">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(file.extension)}
                    <span className="font-mono text-sm truncate" title={file.filename}>
                      {file.filename}
                    </span>
                  </div>
                  <div className="ml-auto text-xs text-gray-500 whitespace-nowrap">
                    {formatDuration(file.totalSeconds)}
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 h-8 border-t border-b relative">
                  {file.timeByHour.map((seconds, hour) => {
                    if (seconds === 0) return null
                    const intensity = Math.min(1, seconds / (30 * 60)) // Max intensity at 30 minutes
                    const opacity = 0.3 + intensity * 0.7 // Scale between 0.3 and 1.0
                    const width = `${(seconds / (60 * 60)) * 100}%` // Width based on percentage of an hour
                    const left = `${(hour / 24) * 100}%` // Position based on hour of day

                    return (
                      <div
                        key={hour}
                        className="absolute h-6 top-1 bg-blue-500 rounded-sm"
                        style={{
                          left,
                          width,
                          opacity,
                        }}
                        title={`${formatDuration(seconds)} at ${formatHourLabel(hour)}`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex justify-end mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 opacity-30 rounded-sm"></div>
                  <span>Light activity</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 opacity-70 rounded-sm"></div>
                  <span>Medium activity</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                  <span>Heavy activity</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
