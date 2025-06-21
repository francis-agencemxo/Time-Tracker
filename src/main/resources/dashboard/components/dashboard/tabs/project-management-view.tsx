"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  EyeOff,
  Eye,
  Trash2,
  Plus,
  Search,
  Settings,
  FolderOpen,
  Clock,
  ExternalLink,
  Pencil,
  RefreshCw,
  Loader2,
  Globe,
  Link,
  Tag,
  Save,
  X,
} from "lucide-react"
import type { StatsData, IgnoredProject, ProjectUrl, ProjectCustomName } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectManagementViewProps {
  statsData: StatsData
  projectUrls: ProjectUrl[]
  ignoredProjects: IgnoredProject[]
  projectCustomNames: ProjectCustomName[]
  currentWeek: Date
  idleTimeoutMinutes: number
  onCreateUrl: (formData: { project: string; url: string; description: string }) => Promise<void>
  onUpdateUrl: (id: string, formData: { project: string; url: string; description: string }) => Promise<void>
  onDeleteUrl: (id: string) => Promise<void>
  onRefreshUrls: () => Promise<void>
  onAddIgnoredProject: (projectName: string) => Promise<void>
  onRemoveIgnoredProject: (id: string) => Promise<void>
  onSaveProjectCustomName: (projectName: string, customName: string) => Promise<void>
  onRemoveProjectCustomName: (id: string) => Promise<void>
}

export function ProjectManagementView({
  statsData,
  projectUrls,
  ignoredProjects,
  projectCustomNames,
  currentWeek,
  idleTimeoutMinutes,
  onCreateUrl,
  onUpdateUrl,
  onDeleteUrl,
  onRefreshUrls,
  onAddIgnoredProject,
  onRemoveIgnoredProject,
  onSaveProjectCustomName,
  onRemoveProjectCustomName,
}: ProjectManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isIgnoreDialogOpen, setIsIgnoreDialogOpen] = useState(false)
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false)
  const [editingUrl, setEditingUrl] = useState<ProjectUrl | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [loading, setLoading] = useState(false)
  const [editingCustomName, setEditingCustomName] = useState<string | null>(null)
  const [customNameInput, setCustomNameInput] = useState("")
  const [urlFormData, setUrlFormData] = useState({
    project: "",
    url: "",
    description: "",
  })

  // Get all projects from stats data (including ignored ones for the full list)
  const {
    getProjectTotals: getFilteredProjectTotals,
    formatDuration,
    getProjectChartData,
  } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)

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
  const projectData = getProjectChartData()

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

  // Helper functions for project URLs
  const getGroupedProjectUrls = () => {
    const grouped: { [project: string]: ProjectUrl[] } = {}

    projectUrls.forEach((url) => {
      if (!grouped[url.project]) {
        grouped[url.project] = []
      }
      grouped[url.project].push(url)
    })

    return grouped
  }

  const getFilteredProjectUrls = () => {
    const grouped = getGroupedProjectUrls()

    if (!searchQuery.trim()) {
      return Object.entries(grouped)
    }

    const query = searchQuery.toLowerCase()
    return Object.entries(grouped).filter(([projectName, urls]) => {
      return (
        projectName.toLowerCase().includes(query) ||
        getProjectDisplayName(projectName).toLowerCase().includes(query) ||
        urls.some((url) => url.url.toLowerCase().includes(query))
      )
    })
  }

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

  const handleEditUrl = (url: ProjectUrl) => {
    setEditingUrl(url)
    setUrlFormData({
      project: url.project,
      url: url.url,
      description: url.description || "",
    })
    setIsUrlDialogOpen(true)
  }

  const resetUrlForm = () => {
    setUrlFormData({
      project: "",
      url: "",
      description: "",
    })
  }

  const handleUrlDialogOpen = (open: boolean) => {
    setIsUrlDialogOpen(open)
    if (!open) {
      setEditingUrl(null)
      resetUrlForm()
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUrl) {
        await onUpdateUrl(editingUrl.id, urlFormData)
      } else {
        await onCreateUrl(urlFormData)
      }
      setIsUrlDialogOpen(false)
      resetUrlForm()
      setEditingUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUrl = async (id: string) => {
    setLoading(true)
    try {
      await onDeleteUrl(id)
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

  const filteredProjectUrls = getFilteredProjectUrls()
  const totalProjects = Object.keys(getGroupedProjectUrls()).length

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
                <CardDescription>Manage project visibility, custom names, URLs, and settings</CardDescription>
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
              <Badge variant="outline" className="px-3 py-1">
                <Link className="w-4 h-4 mr-1" />
                {totalProjects} with URLs
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects, custom names, URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different management sections */}
      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">
            <Settings className="w-4 h-4 mr-2" />
            Project Visibility
          </TabsTrigger>
          <TabsTrigger value="names">
            <Tag className="w-4 h-4 mr-2" />
            Custom Names
          </TabsTrigger>
          <TabsTrigger value="urls">
            <Globe className="w-4 h-4 mr-2" />
            Project URLs
          </TabsTrigger>
        </TabsList>

        {/* Project Visibility Tab */}
        <TabsContent value="projects" className="space-y-6">
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
                  <div className="space-y-2">
                    {filteredActiveProjects.map((project) => (
                      <div
                        key={project.name}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div>
                            <div className="font-medium">{getProjectDisplayName(project.name)}</div>
                            {getProjectDisplayName(project.name) !== project.name && (
                              <div className="text-xs text-gray-500">Original: {project.name}</div>
                            )}
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
                                    Display name:{" "}
                                    <span className="font-medium text-blue-600">{customName.customName}</span>
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

        {/* Project URLs Tab */}
        <TabsContent value="urls" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {searchQuery ? (
                <>
                  Found {filteredProjectUrls.length} of {totalProjects} projects matching "{searchQuery}"
                </>
              ) : (
                <>Showing {totalProjects} projects with URLs</>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={onRefreshUrls} variant="outline" size="sm" className="text-teal-600 hover:text-teal-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isUrlDialogOpen} onOpenChange={handleUrlDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add URL
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingUrl ? "Edit Project URL" : "Add Project URL"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUrlSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="project" className="text-right font-medium">
                          Project
                        </label>
                        <div className="col-span-3">
                          <Select
                            value={urlFormData.project}
                            onValueChange={(value) => setUrlFormData({ ...urlFormData, project: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {allProjectNames.map((name) => (
                                <SelectItem key={name} value={name}>
                                  {getProjectDisplayName(name)}
                                  {getProjectDisplayName(name) !== name && (
                                    <span className="text-gray-500 ml-2">({name})</span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <label htmlFor="url" className="text-right font-medium">
                          URL
                        </label>
                        <Input
                          id="url"
                          value={urlFormData.url}
                          onChange={(e) => setUrlFormData({ ...urlFormData, url: e.target.value })}
                          className="col-span-3"
                          placeholder="https://example.com"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => handleUrlDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingUrl ? "Update" : "Add"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {projectUrls.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 mb-4">No project URLs have been added yet.</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First URL
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : filteredProjectUrls.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No projects match your search criteria.</p>
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2">
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredProjectUrls.map(([projectName, urls]) => (
                <Card key={projectName}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: projectData.find((p) => p.name === projectName)?.color || "#2D5A5A",
                        }}
                      />
                      <CardTitle className="text-lg">
                        {getProjectDisplayName(projectName)}
                        {getProjectDisplayName(projectName) !== projectName && (
                          <span className="text-gray-500 text-sm font-normal ml-2">({projectName})</span>
                        )}
                        <span className="text-gray-500 text-sm font-normal ml-2">({urls.length} URLs)</span>
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {urls.map((url) => (
                        <div key={url.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                          <a
                            href={url.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-2 truncate flex-1"
                          >
                            <Globe className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{url.url}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUrl(url)}
                              className="h-8 w-8 p-0"
                            >
                              <span className="sr-only">Edit</span>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUrl(url.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={loading}
                            >
                              <span className="sr-only">Delete</span>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
