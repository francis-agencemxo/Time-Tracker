"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, ExternalLink, RefreshCw, Loader2, Search } from "lucide-react"
import type { StatsData, ProjectUrl } from "@/hooks/use-time-tracking-data"
import { useTimeCalculations } from "@/hooks/use-time-calculations"

interface ProjectUrlsViewProps {
  projectUrls: ProjectUrl[]
  statsData: StatsData
  currentWeek: Date
  idleTimeoutMinutes: number
  onCreateUrl: (formData: { project: string; url: string; description: string }) => Promise<void>
  onUpdateUrl: (id: string, formData: { project: string; url: string; description: string }) => Promise<void>
  onDeleteUrl: (id: string) => Promise<void>
  onRefresh: () => Promise<void>
}

export function ProjectUrlsView({
  projectUrls,
  statsData,
  currentWeek,
  idleTimeoutMinutes,
  onCreateUrl,
  onUpdateUrl,
  onDeleteUrl,
  onRefresh,
}: ProjectUrlsViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUrl, setEditingUrl] = useState<ProjectUrl | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    project: "",
    url: "",
    description: "", // Keep for API compatibility
  })

  const { getProjectTotals, getProjectChartData } = useTimeCalculations(statsData, currentWeek, idleTimeoutMinutes)
  const projectNames = getProjectTotals().map((project) => project.name)
  const projectData = getProjectChartData()

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

  const getFilteredProjects = () => {
    const grouped = getGroupedProjectUrls()

    if (!searchQuery.trim()) {
      return Object.entries(grouped)
    }

    const query = searchQuery.toLowerCase()
    return Object.entries(grouped).filter(([projectName, urls]) => {
      return projectName.toLowerCase().includes(query) || urls.some((url) => url.url.toLowerCase().includes(query))
    })
  }

  const handleEditUrl = (url: ProjectUrl) => {
    setEditingUrl(url)
    setFormData({
      project: url.project,
      url: url.url,
      description: url.description || "",
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      project: "",
      url: "",
      description: "",
    })
  }

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingUrl(null)
      resetForm()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingUrl) {
        await onUpdateUrl(editingUrl.id, formData)
      } else {
        await onCreateUrl(formData)
      }
      setIsDialogOpen(false)
      resetForm()
      setEditingUrl(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    try {
      await onDeleteUrl(id)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = getFilteredProjects()
  const totalProjects = Object.keys(getGroupedProjectUrls()).length
  const filteredCount = filteredProjects.length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Project URLs</CardTitle>
          <CardDescription>
            {searchQuery ? (
              <>
                Found {filteredCount} of {totalProjects} projects matching "{searchQuery}"
              </>
            ) : (
              <>
                Showing {totalProjects} of {totalProjects} projects
              </>
            )}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="outline" size="sm" className="text-teal-600 hover:text-teal-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
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
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="project" className="text-right font-medium">
                      Project
                    </label>
                    <div className="col-span-3">
                      <Select
                        value={formData.project}
                        onValueChange={(value) => setFormData({ ...formData, project: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
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
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="col-span-3"
                      placeholder="https://example.com"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogOpen(false)}>
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
      </CardHeader>
      <CardContent>
        {/* Search Filter */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects or URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {projectUrls.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-gray-50">
            <p className="text-gray-500 mb-4">No project URLs have been added yet.</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First URL
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8 border rounded-md bg-gray-50">
            <p className="text-gray-500">No projects match your search criteria.</p>
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2">
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredProjects.map(([projectName, urls]) => (
              <div key={projectName} className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: projectData.find((p) => p.name === projectName)?.color || "#2D5A5A",
                    }}
                  />
                  <h3 className="font-medium">
                    {projectName} <span className="text-gray-500 text-sm font-normal">{urls.length} URLs</span>
                  </h3>
                </div>

                <div className="space-y-1">
                  {urls.map((url) => (
                    <div key={url.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <a
                        href={url.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1 truncate max-w-[80%]"
                      >
                        {url.url}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditUrl(url)} className="h-7 w-7 p-0">
                          <span className="sr-only">Edit</span>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(url.id)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={loading}
                        >
                          <span className="sr-only">Delete</span>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
