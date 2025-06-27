"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Edit, Save, FileText, Timer, Play, Pause, Square, Zap } from "lucide-react"
import type { StatsData } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { dateToESTString } from "@/lib/date-utils"

// Enhanced session interface with additional fields
interface EnhancedSession {
  id: string
  start: string
  end: string
  type: "coding" | "browsing" | "meeting" | "planning" | "debugging" | "testing" | "documentation"
  project: string
  file?: string
  url?: string
  host?: string
  // New fields for precise logging
  task?: string
  description?: string
  tags?: string[]
  billable?: boolean
  difficulty?: 1 | 2 | 3 | 4 | 5
  productivity?: 1 | 2 | 3 | 4 | 5
  interruptions?: number
  mood?: "focused" | "distracted" | "energetic" | "tired" | "frustrated" | "satisfied"
  location?: "office" | "home" | "cafe" | "other"
  tools?: string[]
  blockers?: string
  achievements?: string
  nextSteps?: string
}

interface TimeLoggingViewProps {
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  ignoredProjects?: string[]
}

export function TimeLoggingView({
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  ignoredProjects = [],
}: TimeLoggingViewProps) {
  const [activeTimer, setActiveTimer] = useState<{
    project: string
    task: string
    type: EnhancedSession["type"]
    startTime: Date
  } | null>(null)

  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dateToESTString(new Date()))

  const [manualEntry, setManualEntry] = useState<Partial<EnhancedSession>>({
    type: "coding",
    billable: true,
    difficulty: 3,
    productivity: 3,
    interruptions: 0,
    mood: "focused",
    location: "office",
    tags: [],
    tools: [],
  })

  const { getProjectTotals, formatDuration } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
    ignoredProjects,
  )

  const allProjects = getProjectTotals().map((p) => p.name)

  // Timer functions
  const startTimer = (project: string, task: string, type: EnhancedSession["type"]) => {
    setActiveTimer({
      project,
      task,
      type,
      startTime: new Date(),
    })
  }

  const stopTimer = () => {
    if (activeTimer) {
      const endTime = new Date()
      const duration = (endTime.getTime() - activeTimer.startTime.getTime()) / 1000

      // Here you would save the session to your backend
      console.log("Session completed:", {
        ...activeTimer,
        end: endTime.toISOString(),
        duration,
      })

      setActiveTimer(null)
    }
  }

  const pauseTimer = () => {
    // Implementation for pause/resume functionality
    setActiveTimer(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-teal-600" />
            Precise Time Logging
          </CardTitle>
          <CardDescription>
            Enhanced time tracking with detailed session information, live timers, and manual entry
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="timer" className="w-full">
        <TabsList>
          <TabsTrigger value="timer">
            <Play className="w-4 h-4 mr-2" />
            Live Timer
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Edit className="w-4 h-4 mr-2" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="review">
            <FileText className="w-4 h-4 mr-2" />
            Session Review
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <Zap className="w-4 h-4 mr-2" />
            Precision Analytics
          </TabsTrigger>
        </TabsList>

        {/* Live Timer Tab */}
        <TabsContent value="timer" className="space-y-6">
          {/* Active Timer Display */}
          {activeTimer && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <div className="font-medium">{activeTimer.project}</div>
                      <div className="text-sm text-gray-600">{activeTimer.task}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {activeTimer.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-700">
                        {formatDuration((Date.now() - activeTimer.startTime.getTime()) / 1000)}
                      </div>
                      <div className="text-xs text-gray-600">Started {activeTimer.startTime.toLocaleTimeString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={pauseTimer}>
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={stopTimer} className="bg-red-600 hover:bg-red-700">
                        <Square className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Start Timer */}
          <Card>
            <CardHeader>
              <CardTitle>Start New Session</CardTitle>
              <CardDescription>Begin tracking time for a specific task</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {allProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input placeholder="Task description" />

                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="debugging">Debugging</SelectItem>
                    <SelectItem value="testing">Testing</SelectItem>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="browsing">Research/Browsing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700" disabled={!!activeTimer}>
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual Time Entry</CardTitle>
              <CardDescription>Add detailed time entries for past work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Project</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProjects.map((project) => (
                        <SelectItem key={project} value={project}>
                          {project}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Activity Type</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coding">Coding</SelectItem>
                      <SelectItem value="debugging">Debugging</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="browsing">Research/Browsing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Start Time</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time</label>
                  <Input type="time" />
                </div>
              </div>

              {/* Task Details */}
              <div>
                <label className="text-sm font-medium">Task Description</label>
                <Input placeholder="What did you work on?" />
              </div>

              <div>
                <label className="text-sm font-medium">Detailed Notes</label>
                <Textarea placeholder="Additional details, blockers, achievements..." rows={3} />
              </div>

              {/* Enhanced Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium">Difficulty (1-5)</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Rate difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          {level} - {["Very Easy", "Easy", "Medium", "Hard", "Very Hard"][level - 1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Productivity (1-5)</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Rate productivity" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          {level} - {["Very Low", "Low", "Medium", "High", "Very High"][level - 1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Mood</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="How did you feel?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="focused">🎯 Focused</SelectItem>
                      <SelectItem value="energetic">⚡ Energetic</SelectItem>
                      <SelectItem value="satisfied">😊 Satisfied</SelectItem>
                      <SelectItem value="distracted">😵 Distracted</SelectItem>
                      <SelectItem value="tired">😴 Tired</SelectItem>
                      <SelectItem value="frustrated">😤 Frustrated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Where did you work?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">🏢 Office</SelectItem>
                      <SelectItem value="home">🏠 Home</SelectItem>
                      <SelectItem value="cafe">☕ Cafe</SelectItem>
                      <SelectItem value="other">📍 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags and Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <Input placeholder="bug-fix, feature, refactor (comma separated)" />
                </div>
                <div>
                  <label className="text-sm font-medium">Tools Used</label>
                  <Input placeholder="VS Code, Chrome, Figma (comma separated)" />
                </div>
              </div>

              {/* Billable and Interruptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="billable" />
                  <label htmlFor="billable" className="text-sm font-medium">
                    Billable Time
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium">Interruptions Count</label>
                  <Input type="number" min="0" placeholder="0" />
                </div>
              </div>

              <Button className="w-full bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4 mr-2" />
                Save Time Entry
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Review Tab */}
        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Review & Editing</CardTitle>
              <CardDescription>Review and enhance your automatically tracked sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Session review interface would show all sessions for the selected date, allowing you to add missing
                metadata, split sessions, merge sessions, and add detailed descriptions to automatically tracked time.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Precision Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-teal-800">87%</div>
                <p className="text-sm text-gray-600">Avg Productivity</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-teal-800">3.2</div>
                <p className="text-sm text-gray-600">Avg Difficulty</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-teal-800">2.1</div>
                <p className="text-sm text-gray-600">Interruptions/Day</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-teal-800">73%</div>
                <p className="text-sm text-gray-600">Billable Time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
