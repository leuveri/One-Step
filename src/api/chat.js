import { getRandom } from '../data/responses.js'

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3001' : ''

async function classifyMessage(userMessage) {
  const res = await fetch(`${BASE_URL}/api/claude`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'classify',
      userMessage
    })
  })
  const text = await res.text()
  return text.trim().toLowerCase()
}

export async function sendMessage({
  mode,
  task,
  userMessage = '',
  recentMessages = [],
  awaitingWrapup = false
}) {
  if (mode === 'checkin') {
    const prewritten = getRandom('checkin')
    if (prewritten) return { text: prewritten }
  }

  if (mode === 'conversation') {
    try {
      const classification = await classifyMessage(userMessage)
      if (classification !== 'complex') {
        const prewritten = getRandom(classification)
        if (prewritten) return { text: prewritten }
      }
    } catch {
      // fall through to Claude as normal
    }
  }

  const res = await fetch(`${BASE_URL}/api/claude`, {
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
