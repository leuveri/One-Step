import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import 'dotenv/config'

const app = express()
const port = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 messages per 15 mins per IP
  message: {
    error: 'slow_down',
    message: "you're going a bit fast — take a breath and try again in a few minutes 😊"
  },
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/claude', limiter)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// ─── WHO ONESTEP IS ───────────────────────────────────────────────────────────
// This system prompt is sent with EVERY request.
// It defines Claude's identity, tone, and rules permanently.
// Think of it as OneStep's personality card.
const SYSTEM_PROMPT = `You are OneStep — a warm, casual companion helping someone with ADHD get through their tasks.

You sound like a close friend who happens to be really good at helping people get unstuck — not a coach, not a therapist, not a productivity app. Just a supportive person who genuinely cares and knows how ADHD brains work.

TONE RULES (never break these):
- Short responses only. 1-3 sentences max. This is a chat, not an essay.
- Casual language. Contractions, lowercase is fine, natural phrasing.
- Warm but not over the top. Don't say "Amazing!!" or "You've got this champ!"
- Use emojis sparingly and naturally — maybe once per message, not every sentence.
- Never use bullet points, numbered lists, or headers. Ever.
- Never lecture about ADHD or give unsolicited advice.
- Never be preachy, motivational-poster-y, or corporate.

WHAT YOU KNOW ABOUT ADHD (use this to inform your responses, don't quote it):
- Starting is the hardest part, not the doing
- Tiny concrete actions work better than big vague ones
- Shame and guilt make things worse, never use them
- Time blindness is real — vague timelines don't help
- A specific first step removes the "where do I even begin" paralysis`

// ─── QUESTION DETECTOR ────────────────────────────────────────────────────────
function looksLikeQuestion(text) {
  const lowered = text.toLowerCase().trim()
  const starters = ['what', 'how', 'why', 'where', 'when', 'who', 'should', 'can', 'is', 'are']
  return lowered.endsWith('?') || starters.some(w => lowered.startsWith(w + ' '))
}

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────────────
// Each mode gets a focused, personality-consistent prompt.
// The system prompt handles WHO Claude is.
// These handle WHAT Claude needs to do right now.

function buildStartPrompt(task) {
  return `The person just told me they want to: "${task}"

Give them one specific, concrete first step to start right now.
Make it so small it almost feels too easy — that's the point.
End by saying you'll check back in soon. Keep it to 2 sentences max.
Don't ask any questions. Just give them the step and go.`
}

function buildCheckinPrompt(task, recentMessages) {
  const context = recentMessages.length > 0
    ? `Recent conversation:\n${recentMessages.map(m => `${m.role === 'user' ? 'them' : 'me'}: ${m.content}`).join('\n')}`
    : ''
  
  return `I'm checking in on someone working on: "${task}"
${context}

Send a casual check-in. Ask how it's going — are they still at it or have they hit a wall?
One sentence, feels like a friend checking in, not a productivity app.`
}

function buildRoadblockPrompt(task, userMessage, recentMessages) {
  const context = recentMessages.length > 0
    ? `What they've said recently:\n${recentMessages.map(m => `${m.role === 'user' ? 'them' : 'me'}: ${m.content}`).join('\n')}`
    : ''

  return `Someone is stuck on: "${task}"
They just said: "${userMessage}"
${context}

Help them get unstuck with ONE specific small action.
Be warm and practical. Don't make them feel bad for being stuck — it's normal.
2 sentences max.`
}

function buildConversationPrompt(task, userMessage, recentMessages, awaitingWrapup) {
  const context = recentMessages
    .map(m => `${m.role === 'user' ? 'them' : 'me'}: ${m.content}`)
    .join('\n')

  if (awaitingWrapup) {
    return `I just asked if they're done for today. They replied: "${userMessage}"
Their task was: "${task}"

If they're saying yes/done/enough → celebrate briefly (1-2 sentences, warm not over the top) 
and end your response with exactly this on its own line: [SESSION_COMPLETE]

If they're saying no/not yet/keep going → encourage them to continue, 
ask what they're working on next.`
  }

  return `We're mid-conversation. The person is working on: "${task}"
Recent chat:
${context}

They just said: "${userMessage}"

Respond naturally as their companion. Figure out from context what they need:
- Celebrating progress? Acknowledge it warmly and stay alongside them.
- Asking a question? Answer it briefly and bring it back to their task.
- Sounds stuck or frustrated? Give one small concrete action to get unstuck.
- Mentioning a new task entirely? Roll with it — give a micro-step for the new thing.
- Saying they're done/enough for today? Ask: "you good? feel like that's enough for today? 😊"

Always respond. Never leave them without a reply. 2-3 sentences max.`
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────
app.post('/api/claude', async (req, res) => {
  const {
    mode,
    task,
    userMessage,
    recentMessages = [],
    awaitingWrapup = false
  } = req.body

  // Block questions on the very first message
  if (mode === 'start') {
    const goal = (task || '').trim()
    if (!goal) return res.status(400).send('Missing task')

    if (looksLikeQuestion(goal)) {
      return res.json({
        error: 'question',
        message: "hmm, that sounds like a question! try telling me what you want to do instead — like a task or goal 😊"
      })
    }
  }

  // Build the right prompt for the situation
  let userPrompt
  switch (mode) {
    case 'start':
      userPrompt = buildStartPrompt(task)
      break
    case 'checkin':
      userPrompt = buildCheckinPrompt(task, recentMessages)
      break
    case 'roadblock':
      userPrompt = buildRoadblockPrompt(task, userMessage, recentMessages)
      break
    case 'conversation':
    default:
      userPrompt = buildConversationPrompt(task, userMessage, recentMessages, awaitingWrapup)
      break
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      temperature: 0.7,
      system: SYSTEM_PROMPT,        // ← personality lives here, sent every time
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })

    const text = msg.content
      .map(block => ('text' in block ? block.text : ''))
      .join('\n')
      .trim()

    res.send(text)
  } catch (err) {
    console.error('Anthropic error', err)
    res.status(500).send('Error calling Claude')
  }
})

app.listen(port, () => {
  console.log(`Express proxy listening on http://localhost:${port}`)
})