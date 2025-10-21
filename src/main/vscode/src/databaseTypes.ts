export interface SessionRecord {
  id: number;
  project: string;
  date: string;
  start: string;
  end: string;
  type: string;
  file?: string | null;
  host?: string | null;
  url?: string | null;
}

export interface UrlMapping {
  id: number;
  project: string;
  url: string | null;
}

export interface IgnoredProject {
  id: number;
  projectName: string;
  ignoredAt: string;
}

export interface ProjectAlias {
  id: number;
  projectName: string;
  customName: string;
}

export interface ProjectClient {
  id: number;
  projectName: string;
  clientName: string;
  updatedAt: string;
}

export interface CommitRecord {
  id: number;
  project: string;
  commitHash: string;
  commitMessage: string;
  branch: string;
  authorName: string;
  authorEmail: string;
  commitTime: string;
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  createdAt: string;
}

export interface WrikeMapping {
  id: number;
  projectName: string;
  wrikeProjectId: string;
  wrikeProjectTitle: string;
  wrikePermalink: string;
  createdAt: string;
}

export interface MeetingPattern {
  id: number;
  projectName: string;
  urlPattern: string;
  meetingTitle?: string | null;
  description?: string | null;
  autoAssign: boolean;
  lastUsed?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveProject {
  name: string;
}
