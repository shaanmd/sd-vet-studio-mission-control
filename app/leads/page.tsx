// app/leads/page.tsx
// Phase 2 of the leads/contacts merge: leads are now contacts at lifecycle_stage='lead'.
// This page redirects to the unified CRM view filtered by that stage.
import { redirect } from 'next/navigation'

export default function LeadsPage() {
  redirect('/crm?stage=lead')
}
