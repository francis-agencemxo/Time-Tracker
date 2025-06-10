"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Code, FileCode, FileText, Package, File, Globe, ExternalLink } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

import {
  dateToESTString
} from "@/lib/date-utils"

interface ActivityBreakdownViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  selectedProject?: string
}

export function ActivityBreakdownView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  selectedProject,
}: ActivityBreakdownViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [fileFilter, setFileFilter] = useState<string>("")
  const [urlFilter, setUrlFilter] = useState<string>("")

  const {
    getProjectSessionDetails,
    formatDuration,
    getFileActivityForProject,
    getUrlActivityForProject,
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)

  // Get all sessions for the selected project
  const allSessions = selectedProject ? getProjectSessionDetails(selectedProject) : []
debugger;
  // Get unique dates from sessions
  const uniqueDates = Array.from(
    new Set(
      allSessions.map((session) => {
        const date = new Date(session.start)
        return dateToESTString(date)
      }),
    ),
  ).sort((a, b) => b.localeCompare(a))

  // If no date is selected, use the most recent date
  const effectiveDate = selectedDate || uniqueDates[0] || ""

  // Get real file and URL activity data
  const fileActivityData =
    selectedProject && effectiveDate ? getFileActivityForProject(selectedProject, effectiveDate) : []

  const urlActivityData =
    selectedProject && effectiveDate ? getUrlActivityForProject(selectedProject, effectiveDate) : []
debugger;
  // Filter data based on search input
  const filteredFiles = fileFilter
    ? fileActivityData.filter((file) => file.filename.toLowerCase().includes(fileFilter.toLowerCase()))
    : fileActivityData

  const filteredUrls = urlFilter
    ? urlActivityData.filter((url) => url.url.toLowerCase().includes(urlFilter.toLowerCase()))
    : urlActivityData

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
          <CardTitle>Activity Breakdown</CardTitle>
          <CardDescription>Files and URLs for {selectedProject}</CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={effectiveDate || "Select date"} />
            </SelectTrigger>
            <SelectContent>
              {uniqueDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {new Date(date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files" className="w-full">
          <TabsList>
            <TabsTrigger value="files">
              <Code className="w-4 h-4 mr-2" />
              Files ({filteredFiles.length})
            </TabsTrigger>
            <TabsTrigger value="urls">
              <Globe className="w-4 h-4 mr-2" />
              URLs ({filteredUrls.length})
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Filter files..."
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm flex-1"
              />
            </div>

            {filteredFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {fileActivityData.length === 0
                  ? "No file activity data available for this date."
                  : "No files match your filter criteria."}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Hour markers */}
                <div className="flex border-b mb-2 pl-[250px] text-xs text-gray-500">
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
                    <div className="w-[250px] flex items-center pr-4">
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        {getFileIcon(file.extension)}
                        <span className="font-mono text-sm truncate" title={file.fullPath || file.filename}>
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
                        const width = `${Math.min(100, (seconds / (60 * 60)) * 100)}%` // Width based on percentage of an hour
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
              </div>
            )}
          </TabsContent>

          {/* URLs Tab */}
          <TabsContent value="urls" className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Filter URLs..."
                value={urlFilter}
                onChange={(e) => setUrlFilter(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm flex-1"
              />
            </div>

            {filteredUrls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {urlActivityData.length === 0
                  ? "No URL activity data available for this date."
                  : "No URLs match your filter criteria."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUrls.map((urlData, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                      <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-medium text-sm truncate" title={urlData.url}>
                          {urlData.host}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{urlData.url}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatDuration(urlData.totalSeconds)}</div>
                        <div className="text-xs text-gray-500">{urlData.sessionCount} sessions</div>
                      </div>
                      <a
                        href={urlData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
