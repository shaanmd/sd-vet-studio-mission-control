// ============================================================
// String Literal Union Types
// ============================================================

export type Stage =
  | 'inbox'
  | 'someday'
  | 'exploring'
  | 'building'
  | 'live'
  | 'maintenance'
  | 'archived'

export type Energy = 'high' | 'medium' | 'low'

export type InterestLevel = 'hot' | 'warm' | 'curious'

export type BetaAccepted = 'yes' | 'no' | 'pending'

export type BetaFeedbackStatus = 'awaiting' | 'received' | 'follow_up'

export type NoteType = 'note' | 'stage_change' | 'deploy' | 'task_complete'

export type DeployStatus = 'ready' | 'building' | 'error'

export type ResourceCategory =
  | 'dev'
  | 'marketing'
  | 'ai'
  | 'business'
  | 'brand'
  | 'contacts'

export type ActivityAction =
  | 'task_completed'
  | 'note_added'
  | 'stage_changed'
  | 'deployed'
  | 'project_created'
  | 'project_pinned'

// ============================================================
// Core Table Interfaces
// ============================================================

export interface Profile {
  id: string
  name: string
  role: string | null
  avatar_url: string | null
  slack_user_id: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  emoji: string | null
  summary: string | null
  stage: Stage
  pinned: boolean
  github_repo: string | null
  vercel_project_id: string | null
  live_url: string | null
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  assigned_to: string | null
  is_shared: boolean
  is_next_step: boolean
  energy: Energy | null
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
}

export interface PersonalTask {
  id: string
  title: string
  owner_id: string
  project_id: string | null
  energy: Energy | null
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
}

export interface ProjectLink {
  id: string
  project_id: string
  label: string
  url: string
  icon: string | null
  is_auto: boolean
  sort_order: number
}

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string
  content: string
  note_type: NoteType
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  project_id: string | null
  actor_id: string
  action: ActivityAction
  description: string | null
  metadata: Record<string, unknown> | null
  is_win: boolean
  created_at: string
}

export interface Resource {
  id: string
  category: ResourceCategory
  name: string
  description: string | null
  url: string
  icon: string | null
  sort_order: number
}

export interface Lead {
  id: string
  project_id: string
  name: string
  role_clinic: string | null
  contact_email: string | null
  contact_phone: string | null
  source: string | null
  interest_level: InterestLevel
  is_beta_tester: boolean
  beta_invited_at: string | null
  beta_accepted: BetaAccepted | null
  beta_app_version: string | null
  beta_feedback_status: BetaFeedbackStatus
  added_by: string
  created_at: string
}

export interface LeadFeedback {
  id: string
  lead_id: string
  author_id: string
  content: string
  created_at: string
}

export interface GitHubCache {
  id: string
  project_id: string
  last_commit_message: string | null
  last_commit_author: string | null
  last_commit_at: string | null
  open_prs: number
  deploy_status: DeployStatus | null
  deploy_url: string | null
  updated_at: string
}

// ============================================================
// Joined / UI Convenience Types
// ============================================================

export interface ProjectWithDetails extends Project {
  tasks?: Task[]
  next_step?: Task | null
  links?: ProjectLink[]
  leads?: Lead[]
  github_cache?: GitHubCache | null
}

export interface PersonalTaskWithProject extends PersonalTask {
  project?: Pick<Project, 'id' | 'name' | 'emoji'> | null
}

export interface ActivityLogWithDetails extends ActivityLogEntry {
  project?: Pick<Project, 'id' | 'name' | 'emoji'>
  actor?: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

export interface ProjectNoteWithAuthor extends ProjectNote {
  author?: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}
