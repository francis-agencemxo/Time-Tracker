import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeeklyView } from "./tabs/weekly-view"
import { ProjectsView } from "./tabs/projects-view"
import { ProjectBreakdownView } from "./tabs/project-breakdown-view"
import { TrendsView } from "./tabs/trends-view"
import { ProjectUrlsView } from "./tabs/project-urls-view"
import type { StatsData, ProjectUrl } from "@/hooks/use-time-tracking-data"

interface DashboardTabsProps {
  statsData: StatsData
  projectUrls: ProjectUrl[]
  currentWeek: Date
  idleTimeoutMinutes: number
  onCreateUrl: (formData: { project: string; url: string; description: string }) => Promise<void>
  onUpdateUrl: (id: string, formData: { project: string; url: string; description: string }) => Promise<void>
  onDeleteUrl: (id: string) => Promise<void>
  onRefreshUrls: () => Promise<void>
}

export function DashboardTabs({
  statsData,
  projectUrls,
  currentWeek,
  idleTimeoutMinutes,
  onCreateUrl,
  onUpdateUrl,
  onDeleteUrl,
  onRefreshUrls,
}: DashboardTabsProps) {
  return (
    <Tabs defaultValue="weekly" className="space-y-4">
      <TabsList>
        <TabsTrigger value="weekly">Weekly View</TabsTrigger>
        <TabsTrigger value="projects">Projects</TabsTrigger>
        <TabsTrigger value="breakdown">Project Breakdown</TabsTrigger>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="urls">Project URLs</TabsTrigger>
      </TabsList>

      <TabsContent value="weekly">
        <WeeklyView statsData={statsData} currentWeek={currentWeek} idleTimeoutMinutes={idleTimeoutMinutes} />
      </TabsContent>

      <TabsContent value="projects">
        <ProjectsView statsData={statsData} currentWeek={currentWeek} idleTimeoutMinutes={idleTimeoutMinutes} />
      </TabsContent>

      <TabsContent value="breakdown">
        <ProjectBreakdownView statsData={statsData} currentWeek={currentWeek} idleTimeoutMinutes={idleTimeoutMinutes} />
      </TabsContent>

      <TabsContent value="trends">
        <TrendsView statsData={statsData} idleTimeoutMinutes={idleTimeoutMinutes} />
      </TabsContent>

      <TabsContent value="urls">
        <ProjectUrlsView
          projectUrls={projectUrls}
          statsData={statsData}
          currentWeek={currentWeek}
          idleTimeoutMinutes={idleTimeoutMinutes}
          onCreateUrl={onCreateUrl}
          onUpdateUrl={onUpdateUrl}
          onDeleteUrl={onDeleteUrl}
          onRefresh={onRefreshUrls}
        />
      </TabsContent>
    </Tabs>
  )
}
