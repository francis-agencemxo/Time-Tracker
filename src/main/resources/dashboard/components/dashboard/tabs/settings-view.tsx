"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  EyeOff,
  Eye,
  Trash2,
  Plus,
  Search,
  Settings,
  FolderOpen,
  Clock as ClockIcon,
  Pencil,
  Tag,
  Save,
  X,
  Link2,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import type { StatsData, IgnoredProject, ProjectCustomName } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"
import { toast } from "@/components/ui/use-toast"

interface SettingsViewProps {
  statsData: StatsData
  ignoredProjects: IgnoredProject[]
  projectCustomNames: ProjectCustomName[]
  currentWeek: Date
  idleTimeoutMinutes: number
  onIdleTimeoutChange: (minutes: number) => void
  onAddIgnoredProject: (projectName: string) => Promise<void>
  onRemoveIgnoredProject: (id: string) => Promise<void>
  onSaveProjectCustomName: (projectName: string, customName: string) => Promise<void>
  onRemoveProjectCustomName: (id: string) => Promise<void>
}

export function SettingsView({
  statsData,
  ignoredProjects,
  projectCustomNames,
  currentWeek,
  idleTimeoutMinutes,
  onIdleTimeoutChange,
  onAddIgnoredProject,
  onRemoveIgnoredProject,
  onSaveProjectCustomName,
  onRemoveProjectCustomName,
}: SettingsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isIgnoreDialogOpen, setIsIgnoreDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingCustomName, setEditingCustomName] = useState<string | null>(null)
  const [customNameInput, setCustomNameInput] = useState("")

  const { getProjectTotals: getFilteredProjectTotals, formatDuration } = useTimeCalculations(
    statsData,
    currentWeek,
    idleTimeoutMinutes,
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

  // Helper function to get display name for a project
  const getProjectDisplayName = (projectName: string): string => {
    const customName = projectCustomNames.find((p) => p.projectName === projectName)
    return customName ? customName.customName : projectName
  }

  // Helper function to get custom name object for a project
  const getProjectCustomName = (projectName: string): ProjectCustomName | undefined => {
    return projectCustomNames.find((p) => p.projectName === projectName)
  }

  const allProjectNames = getAllProjectNames()
  const activeProjects = getFilteredProjectTotals()
  const ignoredProjectNames = ignoredProjects.map((p) => p.projectName)

  // Filter projects based on search
  const filteredActiveProjects = activeProjects.filter(
    (project) =>
      !ignoredProjectNames.includes(project.name) &&
      (searchQuery === "" ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProjectDisplayName(project.name).toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const filteredIgnoredProjects = ignoredProjects.filter(
    (project) =>
      searchQuery === "" ||
      project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getProjectDisplayName(project.projectName).toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddIgnoredProject = async () => {
    if (!newProjectName.trim()) return

    setLoading(true)
    try {
      await onAddIgnoredProject(newProjectName.trim())
      setNewProjectName("")
      setIsIgnoreDialogOpen(false)
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

  const handleEditCustomName = (projectName: string) => {
    const existingCustomName = getProjectCustomName(projectName)
    setEditingCustomName(projectName)
    setCustomNameInput(existingCustomName?.customName || "")
  }

  const handleSaveCustomName = async (projectName: string) => {
    if (!customNameInput.trim()) return

    setLoading(true)
    try {
      await onSaveProjectCustomName(projectName, customNameInput.trim())
      setEditingCustomName(null)
      setCustomNameInput("")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCustomName = async (projectName: string) => {
    const customName = getProjectCustomName(projectName)
    if (!customName) return

    setLoading(true)
    try {
      await onRemoveProjectCustomName(customName.id)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelCustomName = () => {
    setEditingCustomName(null)
    setCustomNameInput("")
  }

  const idleTimeoutOptions = [5, 10, 15, 20, 30]

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-teal-600" />
              <div>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage your time tracker preferences and projects</CardDescription>
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
              <Badge variant="outline" className="px-3 py-1">
                <Tag className="w-4 h-4 mr-1" />
                {projectCustomNames.length} Custom Names
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different settings sections */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">
            <ClockIcon className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Settings className="w-4 h-4 mr-2" />
            Project Visibility
          </TabsTrigger>
          <TabsTrigger value="names">
            <Tag className="w-4 h-4 mr-2" />
            Custom Names
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Idle Timeout</CardTitle>
              <CardDescription>
                Set the time after which inactivity will split sessions. This affects how sessions are grouped together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Label htmlFor="idle-timeout" className="text-sm font-medium">
                  Idle timeout duration:
                </Label>
                <Select
                  value={idleTimeoutMinutes.toString()}
                  onValueChange={(value) => onIdleTimeoutChange(parseInt(value))}
                >
                  <SelectTrigger id="idle-timeout" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {idleTimeoutOptions.map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Visibility Tab */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Dialog open={isIgnoreDialogOpen} onOpenChange={setIsIgnoreDialogOpen}>
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
                              {getProjectDisplayName(projectName)}
                              {getProjectDisplayName(projectName) !== projectName && (
                                <span className="text-gray-500 ml-2">({projectName})</span>
                              )}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsIgnoreDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddIgnoredProject} disabled={!newProjectName.trim() || loading}>
                    Ignore Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

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
                  <div className="space-y-3">
                    {filteredActiveProjects.map((project) => (
                      <div key={project.name} className="p-4 border rounded-lg hover:bg-gray-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div className="flex-1">
                              <div className="font-medium">{getProjectDisplayName(project.name)}</div>
                              {getProjectDisplayName(project.name) !== project.name && (
                                <div className="text-xs text-gray-500">Original: {project.name}</div>
                              )}
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
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

                        {/* Wrike Project Mapping */}
                        {false && wrikeBearerToken && (
                          <div className="ml-6 pl-4 border-l-2 border-purple-200">
                            <Label className="text-xs text-gray-600 mb-1 block">
                              <Link2 className="w-3 h-3 inline mr-1" />
                              Link to Wrike Project
                            </Label>
                            <Select
                              disabled={wrikeProjectsLoading}
                              onValueChange={async (value) => {
                                const selectedWrikeProject = wrikeProjects.find((wp) => wp.id === value)
                                if (selectedWrikeProject) {
                                  await onSaveWrikeMapping(project.name, selectedWrikeProject)
                                }
                              }}
                              value={wrikeProjectMappings.find((m) => m.projectName === project.name)?.wrikeProjectId || ""}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={
                                    wrikeProjectsLoading ? "Loading Wrike projects..." : "Select a Wrike project"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-2">
                                  <Input
                                    placeholder="Search Wrike projects..."
                                    value={wrikeProjectSearch}
                                    onChange={(e) => setWrikeProjectSearch(e.target.value)}
                                    className="mb-2"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                {wrikeProjects
                                  .filter(
                                    (wp) =>
                                      wrikeProjectSearch === "" ||
                                      wp.title.toLowerCase().includes(wrikeProjectSearch.toLowerCase()),
                                  )
                                  .map((wrikeProject) => (
                                    <SelectItem key={wrikeProject.id} value={wrikeProject.id}>
                                      {wrikeProject.title}
                                    </SelectItem>
                                  ))}
                                {wrikeProjects.length === 0 && !wrikeProjectsLoading && (
                                  <div className="text-sm text-gray-500 p-2 text-center">No Wrike projects found</div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
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
                            <div className="font-medium">{getProjectDisplayName(project.projectName)}</div>
                            {getProjectDisplayName(project.projectName) !== project.projectName && (
                              <div className="text-xs text-gray-500">Original: {project.projectName}</div>
                            )}
                            <div className="text-sm text-gray-500">
                              Ignored {new Date(project.ignoredAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Names Tab */}
        <TabsContent value="names" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Project Custom Names
              </CardTitle>
              <CardDescription>
                Set custom display names for your projects. The original project names will still be used for tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allProjectNames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No projects found. Start tracking time to see projects here.
                </div>
              ) : (
                <div className="space-y-3">
                  {allProjectNames
                    .filter(
                      (projectName) =>
                        searchQuery === "" ||
                        projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        getProjectDisplayName(projectName).toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((projectName) => {
                      const customName = getProjectCustomName(projectName)
                      const isEditing = editingCustomName === projectName

                      return (
                        <div
                          key={projectName}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{projectName}</div>
                            {isEditing ? (
                              <div className="mt-2 flex items-center gap-2">
                                <Input
                                  value={customNameInput}
                                  onChange={(e) => setCustomNameInput(e.target.value)}
                                  placeholder="Enter custom name"
                                  className="flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveCustomName(projectName)
                                    } else if (e.key === "Escape") {
                                      handleCancelCustomName()
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveCustomName(projectName)}
                                  disabled={!customNameInput.trim() || loading}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelCustomName}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-600 mt-1">
                                {customName ? (
                                  <>
                                    Display name: <span className="font-medium text-blue-600">{customName.customName}</span>
                                  </>
                                ) : (
                                  "No custom name set"
                                )}
                              </div>
                            )}
                          </div>
                          {!isEditing && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditCustomName(projectName)}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                {customName ? "Edit" : "Set Name"}
                              </Button>
                              {customName && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveCustomName(projectName)}
                                  disabled={loading}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
