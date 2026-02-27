export async function sendMessage({
  mode,
  task,
  userMessage = '',
  recentMessages = [],
  awaitingWrapup = false
}) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, task, userMessage, recentMessages, awaitingWrapup })
  })

  // Handle question validation error
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    const json = await res.json()
    if (json.error === 'question') return { error: 'question', message: json.message }
  }

  if (!res.ok) throw new Error('Server error')
  const text = await res.text()
  return { text }
}
