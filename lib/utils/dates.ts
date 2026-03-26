/**
 * Returns a human-readable relative time string.
 * Examples: "just now", "5m ago", "2h ago", "3d ago", "15 Mar"
 */
export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`

  // Older than ~30 days: show "15 Mar"
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

/**
 * Returns a formatted date string in NZ format.
 * Example: "15 Mar 2026"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
