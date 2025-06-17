"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { EyeOff, Eye, Trash2, Plus, Search, AlertTriangle, Settings, FolderOpen, Clock } from "lucide-react"
import type { StatsData, IgnoredProject } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectManagementViewProps {
  statsData: StatsData
  ignoredProjects: IgnoredProject[]
  currentWeek: Date
  idleTimeoutMinutes: number
  onAddIgnoredProject: (projectName: string) => Promise<void>
  onRemoveIgnoredProject: (id: string) => Promise<void>
}

export function ProjectManagementView({
  statsData,
  ignoredProjects,
  currentWeek,
  idleTimeoutMinutes,
  onAddIgnoredProject,
  onRemoveIgnoredProject,
}: ProjectManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [loading, setLoading] = useState(false)

  // Get all projects from stats data (including ignored ones for the full list)
  const { getProjectTotals: getFilteredProjectTotals, formatDuration } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
    [], // Don't filter any projects for the management view
  )

  // Get all unique project names from all time data
  const getAllProjectNames = (): string[] => {
    const projectNames = new Set<string>()

    Object.values(statsData).forEach((dayData) => {
      Object.keys(dayData).forEach((projectName) => {
        projectNames.add(projectName)
      })
    })

    return Array.from(projectNames).sort()
  }

  const allProjectNames = getAllProjectNames()
  const activeProjects = getFilteredProjectTotals()
  const ignoredProjectNames = ignoredProjects.map((p) => p.project_name)

debugger;
  // Filter projects based on search
  const filteredActiveProjects = activeProjects.filter(
    (project) =>
      !ignoredProjectNames.includes(project.name) &&
      (searchQuery === "" || project.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const filteredIgnoredProjects = ignoredProjects.filter(
    (project) => searchQuery === "" || project.project_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddIgnoredProject = async () => {
    if (!newProjectName.trim()) return

    setLoading(true)
    try {
      await onAddIgnoredProject(newProjectName.trim())
      setNewProjectName("")
      setIsAddDialogOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveIgnoredProject = async (id: string) => {
    setLoading(true)
    try {
      await onRemoveIgnoredProject(id)
    } finally {
      setLoading(false)
    }
  }

  const handleIgnoreProject = async (projectName: string) => {
    setLoading(true)
    try {
      await onAddIgnoredProject(projectName)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-teal-600" />
              <div>
                <CardTitle>Project Management</CardTitle>
                <CardDescription>Manage which projects are included in your time tracking calculations</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <FolderOpen className="w-4 h-4 mr-1" />
                {filteredActiveProjects.length} Active
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <EyeOff className="w-4 h-4 mr-1" />
                {ignoredProjects.length} Ignored
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Add */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Ignore Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ignore Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="project-name" className="text-sm font-medium">
                      Project Name
                    </label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name to ignore"
                      className="mt-1"
                    />
                  </div>
                  {allProjectNames.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Or select from existing projects:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {allProjectNames
                          .filter((name) => !ignoredProjectNames.includes(name))
                          .map((projectName) => (
                            <Button
                              key={projectName}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left"
                              onClick={() => setNewProjectName(projectName)}
                            >
                              {projectName}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddIgnoredProject} disabled={!newProjectName.trim() || loading}>
                    Ignore Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      {ignoredProjects.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ignored projects are excluded from all calculations, charts, and statistics throughout the dashboard. This
            affects weekly totals, project breakdowns, and all other analytics.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-600" />
              Active Projects ({filteredActiveProjects.length})
            </CardTitle>
            <CardDescription>Projects included in calculations and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredActiveProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "No active projects match your search." : "No active projects found."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredActiveProjects.map((project) => (
                  <div
                    key={project.name}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(project.duration)} this week
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIgnoreProject(project.name)}
                      disabled={loading}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      Ignore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ignored Projects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-orange-600" />
              Ignored Projects ({filteredIgnoredProjects.length})
            </CardTitle>
            <CardDescription>Projects excluded from calculations and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredIgnoredProjects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "No ignored projects match your search." : "No projects are currently ignored."}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredIgnoredProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <div>
                        <div className="font-medium">{project.project_name}</div>
                        <div className="text-sm text-gray-500">
                          Ignored {new Date(project.ignoredAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveIgnoredProject(project.id)}
                        disabled={loading}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Include
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
