// lib/mutations/revenue.ts
import { createClient } from '@/lib/supabase/client'

export async function logRevenue(values: {
  description: string
  amount: number
  stream: string
  project_id?: string | null
  revenue_date?: string
  created_by: string
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('revenue_entries')
    .insert({ revenue_date: new Date().toISOString().split('T')[0], ...values })
  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function logExpense(values: {
  description: string
  amount: number
  category: string
  project_id?: string | null
  paid_by: 'shaan' | 'deb' | 'split'
  expense_date?: string
  created_by: string
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .insert({ expense_date: new Date().toISOString().split('T')[0], ...values })
  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}
