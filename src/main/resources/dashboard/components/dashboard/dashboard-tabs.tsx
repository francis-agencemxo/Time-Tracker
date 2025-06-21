"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyView } from "./tabs/weekly-view"
import { ProjectsView } from "./tabs/projects-view"
import { ProjectBreakdownView } from "./tabs/project-breakdown-view"
import { TrendsView } from "./tabs/trends-view"
import { ProjectDetailView } from "./tabs/project-detail-view"
import { ProjectManagementView } from "./tabs/project-management-view"
import type { StatsData, ProjectUrl, IgnoredProject, ProjectCustomName } from "@/hooks/use-time-tracking-data"

interface DashboardTabsProps {
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
  selectedProject?: string
  onProjectSelect?: (projectName: string | null) => void
  activeTab: string
  onTabChange: (tab: string) => void
}

export function DashboardTabs({
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
  selectedProject,
  onProjectSelect,
  activeTab,
  onTabChange,
}: DashboardTabsProps) {
  // Handle project selection and tab switching
  const handleProjectSelect = (projectName: string | null) => {
    if (onProjectSelect) {
      onProjectSelect(projectName)
    }
    if (projectName) {
      onTabChange("projects")
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="weekly">Weekly View</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="breakdown">Project Breakdown</TabsTrigger>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="management">Project Management</TabsTrigger>
      </TabsList>

      <TabsContent value="weekly">
        <WeeklyView
          statsData={statsData}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onProjectSelect={handleProjectSelect}
        />
      </TabsContent>

      <TabsContent value="projects">
        {selectedProject ? (
          <ProjectDetailView
            statsData={statsData}
            currentWeek={currentWeek}
            idleTimeoutMinutes={idleTimeoutMinutes}
            selectedProject={selectedProject}
            projectUrls={projectUrls}
            onBack={() => handleProjectSelect(null)}
          />
        ) : (
          <ProjectsView
            statsData={statsData}
            currentWeek={currentWeek}
            idleTimeoutMinutes={idleTimeoutMinutes}
            onProjectSelect={handleProjectSelect}
          />
        )}
      </TabsContent>

      <TabsContent value="breakdown">
        <ProjectBreakdownView statsData={statsData} currentWeek={currentWeek} idleTimeoutMinutes={idleTimeoutMinutes} />
      </TabsContent>

      <TabsContent value="trends">
        <TrendsView statsData={statsData} idleTimeoutMinutes={idleTimeoutMinutes} />
      </TabsContent>

      <TabsContent value="management">
        <ProjectManagementView
          statsData={statsData}
          projectUrls={projectUrls}
          ignoredProjects={ignoredProjects}
          projectCustomNames={projectCustomNames}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onCreateUrl={onCreateUrl}
          onUpdateUrl={onUpdateUrl}
          onDeleteUrl={onDeleteUrl}
          onRefreshUrls={onRefreshUrls}
          onAddIgnoredProject={onAddIgnoredProject}
          onRemoveIgnoredProject={onRemoveIgnoredProject}
          onSaveProjectCustomName={onSaveProjectCustomName}
          onRemoveProjectCustomName={onRemoveProjectCustomName}
        />
      </TabsContent>
    </Tabs>
  )
}
