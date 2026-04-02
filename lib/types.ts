// lib/types.ts

export type RevenueScore = 'low' | 'medium' | 'high'
export type RevenueStream = 'course' | 'subscription' | 'inapp' | 'consulting' | 'sponsorship' | 'affiliate' | 'other'
export type ProjectStage = 'inbox' | 'someday' | 'exploring' | 'building' | 'live' | 'maintenance' | 'archived'
export type EnergyLevel = 'high' | 'medium' | 'low'
export type InterestLevel = 'hot' | 'warm' | 'curious'
export type ExpenseCategory = 'hosting' | 'domains' | 'subscriptions' | 'tools_ai' | 'marketing' | 'other'
export type PaidBy = 'shaan' | 'deb' | 'split'
export type Platform = 'instagram' | 'tiktok' | 'email' | 'youtube' | 'other'
export type ContentStatus = 'draft' | 'scheduled' | 'published'
export type NoteType = 'note' | 'stage_change' | 'deploy' | 'task_complete'
export type BetaAccepted = 'yes' | 'no' | 'pending'
export type FeedbackStatus = 'awaiting' | 'received' | 'follow_up'
export type DeployStatus = 'ready' | 'building' | 'error'

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
  emoji: string
  summary: string | null
  stage: ProjectStage
  revenue_score: RevenueScore
  revenue_stream: RevenueStream | null
  revenue_per_conversion: number | null
  pinned: boolean
  github_repo: string | null
  vercel_project_id: string | null
  live_url: string | null
  created_by: string | null
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
  energy: EnergyLevel
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
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
  beta_feedback_status: FeedbackStatus
  added_by: string | null
  created_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  author_id: string | null
  content: string
  created_at: string
}

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string | null
  content: string
  note_type: NoteType
  created_at: string
}

export interface ActivityLog {
  id: string
  project_id: string | null
  actor_id: string | null
  action: string
  description: string
  metadata: Record<string, unknown> | null
  is_win: boolean
  created_at: string
}

export interface ProjectLink {
  id: string
  project_id: string
  label: string
  url: string
  icon: string
  is_auto: boolean
  sort_order: number
}

export interface Resource {
  id: string
  category: string
  name: string
  description: string | null
  url: string | null
  icon: string
  sort_order: number
}

export interface GithubCache {
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

// Composite type used by Home screen money moves list
export interface MoneyMove {
  task: Task
  project: Project
}
