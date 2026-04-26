// ============================================================
// String Literal Union Types
// ============================================================

export type Stage =
  | 'inbox'
  | 'someday'
  | 'exploring'
  | 'building'
  | 'beta'
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
  | 'revenue_logged'

export type ProjectType = 'website_build' | 'saas' | 'course' | 'consulting' | 'other'

export type RevenueScore = 'low' | 'medium' | 'high'

export type RevenueStream =
  | 'course'
  | 'subscription'
  | 'inapp'
  | 'consulting'
  | 'website_builds'
  | 'sponsorship'
  | 'affiliate'
  | 'other'

export type PaidBy = 'shaan' | 'deb' | 'split'

export type ExpenseCategory =
  | 'hosting'
  | 'domains'
  | 'subscriptions'
  | 'tools_ai'
  | 'marketing'
  | 'other'

export type Platform = 'instagram' | 'tiktok' | 'email' | 'youtube' | 'other'

export type ContentStatus = 'draft' | 'scheduled' | 'published'

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

export interface ProjectDomain {
  name: string        // e.g. vetalign.com.au
  registrar: string   // e.g. Cloudflare, GoDaddy
  expiry: string      // ISO date string YYYY-MM-DD
}

export interface ProjectDoc {
  label: string       // e.g. "Claude Design", "PRD", "Branding Guide"
  url: string
}

export interface LaunchGate {
  id: string          // stable slug e.g. 'domain_live'
  label: string
  hint?: string
  checked: boolean
  custom: boolean     // user-added, can be removed
  sort_order: number
}

export interface PulseTileValue {
  tile_id: string     // e.g. 'enrolled_students', 'mrr'
  value: number | null
  label_override?: string
}

export interface Project {
  id: string
  name: string
  emoji: string | null
  summary: string | null
  stage: Stage
  pinned: boolean
  revenue_score: RevenueScore
  revenue_stream: RevenueStream[] | null
  revenue_per_conversion: number | null
  github_repo: string | null
  vercel_project_id: string | null
  live_url: string | null
  owner: 'shaan' | 'deb' | 'both' | null
  goals: string | null
  tech_stack: string | null
  target_audience: string | null
  domains: ProjectDomain[]
  project_type: ProjectType | null
  launch_gates: LaunchGate[]
  pulse_values: PulseTileValue[]
  staging_url: string | null
  key_docs: ProjectDoc[]
  client_name: string | null
  client_email: string | null
  delivery_date: string | null
  ga4_property_id: string | null
  monthly_visitors: number | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type Recurrence = 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  assigned_to: string | null
  is_shared: boolean
  is_next_step: boolean
  energy: Energy | null
  due_date: string | null
  recurrence: Recurrence | null
  recurrence_next_due: string | null
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

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  project_id: string | null
  paid_by: PaidBy
  expense_date: string
  created_by: string | null
  created_at: string
}

export interface RevenueEntry {
  id: string
  description: string
  amount: number
  stream: RevenueStream
  project_id: string | null
  revenue_date: string
  created_by: string | null
  created_at: string
}

export interface ProjectAnalysis {
  id: string
  project_id: string
  income_potential: string | null
  build_difficulty: string | null
  recommendation: string | null
  raw_output: string | null
  analysed_at: string
  analysed_by: string | null
}

export interface ContentItem {
  id: string
  project_id: string | null
  platform: Platform
  description: string
  scheduled_date: string | null
  status: ContentStatus
  created_by: string | null
  created_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  author_id: string | null
  content: string
  created_at: string
}

// Composite type used by Home screen money moves list
export interface MoneyMove {
  task: Task
  project: Project
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
