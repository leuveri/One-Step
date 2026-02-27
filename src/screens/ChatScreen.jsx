import React, { useRef, useState, useEffect, useCallback } from 'react'
import BodyDoubleIndicator from '../components/BodyDoubleIndicator.jsx'
import { sendMessage } from '../api/chat.js'

const CHECKIN_MS = 10 * 60 * 1000 // 10 minutes

function messageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function ChatScreen({
  onOpenJournal,
  bodyDoubleCount,
  setBodyDoubleCount,
  streak,
  winsJournal = [],
  onSaveWin
}) {
  const [messages, setMessages] = useState([])
  const [task, setTask] = useState('')
  const [awaitingWrapup, setAwaitingWrapup] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [input, setInput] = useState('')
  const [mood, setMood] = useState('idle')

  const checkinTimerRef = useRef(null)
  const scrollBottomRef = useRef(null)
  const taskRef = useRef(task)
  const messagesRef = useRef(messages)
  const moodTimerRef = useRef(null)
  const pendingMoodRef = useRef('idle')

  taskRef.current = task
  messagesRef.current = messages

  const resetCheckinTimer = useCallback(() => {
    if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current)
    if (!taskRef.current) return
    checkinTimerRef.current = setTimeout(async () => {
      checkinTimerRef.current = null
      setIsTyping(true)
      try {
        const result = await sendMessage({
          mode: 'checkin',
          task: taskRef.current,
          recentMessages: messagesRef.current.slice(-4).map((m) => ({ role: m.role, content: m.content }))
        })
        if (result.text) {
          setMessages((prev) => [
            ...prev,
            { id: messageId(), role: 'assistant', content: result.text, timestamp: Date.now() }
          ])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsTyping(false)
      }
    }, CHECKIN_MS)
  }, [])

  useEffect(() => {
    return () => {
      if (checkinTimerRef.current) clearTimeout(checkinTimerRef.current)
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current)
    }
  }, [])

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const addMessage = useCallback(({ role, content }) => {
    setMessages((prev) => [
      ...prev,
      { id: messageId(), role, content, timestamp: Date.now() }
    ])
  }, [])

  const removeLastMessage = useCallback(() => {
    setMessages((prev) => prev.slice(0, -1))
  }, [])

  const saveToWinsJournal = useCallback(
    ({ task: winTask, messageCount }) => {
      onSaveWin({
        id: messageId(),
        task: winTask,
        messageCount,
        date: new Date().toISOString().slice(0, 10),
        firstStep: '',
        timestamp: Date.now()
      })
    },
    [onSaveWin]
  )

  const clearMoodTimer = useCallback(() => {
    if (moodTimerRef.current) {
      clearTimeout(moodTimerRef.current)
      moodTimerRef.current = null
    }
  }, [])

  const setCelebratingFor = useCallback(
    (ms) => {
      clearMoodTimer()
      setMood('celebrating')
      moodTimerRef.current = setTimeout(() => {
        moodTimerRef.current = null
        setMood('idle')
      }, ms)
    },
    [clearMoodTimer]
  )

  const inferMoodFromUserText = useCallback((text) => {
    const t = (text || '').toLowerCase()
    const celebratingWords = [
      'done',
      'finished',
      'started',
      'did it',
      'i did',
      'i just',
      'completed',
      'sent it',
      'submitted',
      'cleaned',
      'emailed',
      'worked on it',
      'progress'
    ]
    const concernedWords = [
      'stuck',
      'frustrated',
      'blocked',
      'lost',
      'confused',
      'overwhelmed',
      'can’t',
      "can't",
      'hard',
      'i hate',
      'ugh'
    ]

    if (celebratingWords.some((w) => t.includes(w))) return 'celebrating'
    if (concernedWords.some((w) => t.includes(w))) return 'concerned'
    return 'idle'
  }, [])

  const handleSend = async (overrideText) => {
    const userText = (overrideText ?? input).trim()
    if (!userText || inputDisabled) return

    if (!overrideText) {
      setInput('')
    }
    setErrorMessage('')

    addMessage({ role: 'user', content: userText })
    setInputDisabled(true)
    setIsTyping(true)
    pendingMoodRef.current = inferMoodFromUserText(userText)
    if (pendingMoodRef.current === 'concerned') {
      clearMoodTimer()
      setMood('concerned')
    }

    const isFirstMessage = task === ''
    const mode = isFirstMessage ? 'start' : 'conversation'

    if (isFirstMessage) setTask(userText)

    const recentMessages = messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content
    }))

    let result
    try {
      result = await sendMessage({
        mode,
        task: isFirstMessage ? userText : task,
        userMessage: userText,
        recentMessages,
        awaitingWrapup
      })
    } catch (e) {
      console.error(e)
      setIsTyping(false)
      setInputDisabled(false)
      addMessage({
        role: 'assistant',
        content: "Something went wrong. Try again in a sec?"
      })
      return
    }

    setIsTyping(false)
    setInputDisabled(false)

    if (result.error === 'question') {
      setErrorMessage(result.message)
      removeLastMessage()
      clearMoodTimer()
      setMood('idle')
      return
    }

    const responseText = result.text ?? ''

    if (responseText.includes('[SESSION_COMPLETE]')) {
      const cleanText = responseText.replace('[SESSION_COMPLETE]', '').trim()
      addMessage({ role: 'assistant', content: cleanText })
      saveToWinsJournal({ task: isFirstMessage ? userText : task, messageCount: messages.length + 2 })
      addMessage({ role: 'system', content: '💛 saved to your wins · tap 📓 to see them all' })
      setTask('')
      setAwaitingWrapup(false)
      resetCheckinTimer()
      setCelebratingFor(5000)
      return
    }

    const wrapupPhrases = ["feel like that's enough", 'enough for today', 'you good?']
    const isWrapupQuestion = wrapupPhrases.some((p) =>
      responseText.toLowerCase().includes(p)
    )
    setAwaitingWrapup(isWrapupQuestion)

    addMessage({ role: 'assistant', content: responseText })

    if (!isFirstMessage) resetCheckinTimer()

    if (pendingMoodRef.current === 'celebrating') {
      setCelebratingFor(3000)
    } else {
      clearMoodTimer()
      setMood(pendingMoodRef.current)
    }
  }

  const handleExampleClick = (exampleText) => {
    if (isTyping || inputDisabled) return
    setInput('')
    handleSend(exampleText)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const totalSteps = (winsJournal || []).reduce(
    (sum, entry) => sum + (Number(entry?.messageCount) || 0),
    0
  )
  const progressPct = Math.min(100, Math.max(0, totalSteps))

  return (
    <div className="flex h-screen w-full max-w-[680px] flex-col mx-auto bg-transparent">
      <header
        className="sticky top-0 z-10 grid shrink-0 grid-cols-3 items-center gap-2 px-5 py-4 md:px-6"
        style={{
          background: 'rgba(250,246,240,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(249,115,22,0.1)'
        }}
      >
        <h1
          className="font-fraunces font-bold"
          style={{ fontSize: '1.3rem', color: '#1c1917', letterSpacing: '-0.02em' }}
        >
          OneStep
        </h1>
        <div className="flex justify-center">
          <BodyDoubleIndicator baseCount={bodyDoubleCount} onChange={setBodyDoubleCount} shortLabel />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenJournal}
            className="flex items-center justify-center rounded-full bg-white/80 p-2.5 shadow-sm hover:bg-white"
            aria-label="Wins journal"
          >
            <span className="text-xl">📓</span>
          </button>
        </div>
      </header>

      <div
        className="chat-scroll relative flex-1 overflow-y-auto px-5 py-6 md:px-6"
        style={{
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)'
        }}
      >
        {messages.length === 0 && !isTyping && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center gap-10">
            <div className="px-2">
              <p className="font-fraunces text-4xl font-bold md:text-5xl" style={{ color: '#1c1917' }}>
                hey what are we tackling today?
              </p>
              <p className="mt-5 text-lg font-jakarta max-w-md mx-auto" style={{ color: '#78716c' }}>
                tell me what you&apos;ve been avoiding — i&apos;ll help you take one tiny step
              </p>
            </div>
            <div className="w-full max-w-[560px] mx-auto flex flex-col items-stretch gap-3">
              <button
                type="button"
                onClick={() => handleExampleClick("reply to that email I've been avoiding")}
                className="w-full rounded-full border-[1.5px] px-6 py-3 font-jakarta text-[0.88rem] shadow-[0_2px_8px_rgba(249,115,22,0.08)] transition-all duration-150 ease-out hover:-translate-y-[1px]"
                style={{
                  background: '#ffffff',
                  borderColor: 'rgba(249,115,22,0.25)',
                  color: '#c2410c'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff8f0'
                  e.currentTarget.style.borderColor = '#f97316'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'
                }}
              >
                reply to that email I&apos;ve been avoiding
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('start cleaning my room')}
                className="w-full rounded-full border-[1.5px] px-6 py-3 font-jakarta text-[0.88rem] shadow-[0_2px_8px_rgba(249,115,22,0.08)] transition-all duration-150 ease-out hover:-translate-y-[1px]"
                style={{
                  background: '#ffffff',
                  borderColor: 'rgba(249,115,22,0.25)',
                  color: '#c2410c'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff8f0'
                  e.currentTarget.style.borderColor = '#f97316'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'
                }}
              >
                start cleaning my room
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('work on my project for 10 minutes')}
                className="w-full rounded-full border-[1.5px] px-6 py-3 font-jakarta text-[0.88rem] shadow-[0_2px_8px_rgba(249,115,22,0.08)] transition-all duration-150 ease-out hover:-translate-y-[1px]"
                style={{
                  background: '#ffffff',
                  borderColor: 'rgba(249,115,22,0.25)',
                  color: '#c2410c'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff8f0'
                  e.currentTarget.style.borderColor = '#f97316'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.25)'
                }}
              >
                work on my project for 10 minutes
              </button>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 py-2 pl-1">
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                background: '#fff8f0',
                border: '1.5px solid rgba(249,115,22,0.2)',
                borderRadius: '50%'
              }}
              aria-hidden
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>👻</span>
            </span>
            <span className="flex gap-0.5 font-body text-sm text-neutral-500">
              <span className="typing-dot">.</span>
              <span className="typing-dot animation-delay-200">.</span>
              <span className="typing-dot animation-delay-400">.</span>
            </span>
          </div>
        )}
        <div ref={scrollBottomRef} />
      </div>

      <div
        className="shrink-0 px-5 md:px-6"
        style={{
          background: 'rgba(250,246,240,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(249,115,22,0.1)',
          padding: '14px 20px'
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (errorMessage) setErrorMessage('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="what do you need to do?"
            disabled={isTyping || inputDisabled}
            className="flex-1 rounded-full border-[1.5px] bg-white outline-none placeholder:text-neutral-400 disabled:opacity-70 disabled:cursor-not-allowed font-jakarta"
            style={{
              padding: '12px 20px',
              fontSize: '0.9rem',
              borderColor: 'rgba(0,0,0,0.08)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              color: '#1c1917'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.08)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || inputDisabled}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white disabled:cursor-not-allowed disabled:opacity-50 transition-[transform,box-shadow] duration-150"
            aria-label="Send"
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
              boxShadow: '0 2px 8px rgba(249,115,22,0.3)'
            }}
            onMouseEnter={(e) => {
              if (e.currentTarget.disabled) return
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(249,115,22,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(249,115,22,0.3)'
            }}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
        {errorMessage && (
          <p className="mt-2 text-center text-xs text-amber-700/90">
            {errorMessage}
          </p>
        )}
        {streak >= 2 && !errorMessage && (
          <p
            className="mt-3 text-center font-jakarta"
            style={{
              fontSize: '0.75rem',
              color: '#f97316',
              letterSpacing: '0.02em',
              padding: 8,
              background: 'rgba(249,115,22,0.04)',
              borderRadius: 10
            }}
          >
            You&apos;ve shown up {streak} days running 🔥
          </p>
        )}
      </div>

      <style>{`
        .typing-dot {
          animation: typingBounce 0.6s ease-in-out infinite both;
        }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function MessageBubble({ message }) {
  const [showTime, setShowTime] = useState(false)
  const { role, content, timestamp } = message

  if (role === 'system') {
    return (
      <div className="my-4 flex w-full justify-center">
        <span
          className="inline-block font-jakarta"
          style={{
            background: 'rgba(249,115,22,0.06)',
            borderRadius: 9999,
            padding: '6px 16px',
            fontSize: '0.75rem',
            color: '#c2410c'
          }}
        >
          {content}
        </span>
      </div>
    )
  }

  if (role === 'user') {
    return (
      <div className="mb-4 flex w-full justify-end">
        <button
          type="button"
          onClick={() => setShowTime((s) => !s)}
          className="max-w-[72%] text-left font-jakarta"
          style={{
            background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
            borderRadius: '18px 18px 4px 18px',
            boxShadow: '0 1px 2px rgba(249,115,22,0.2), 0 4px 12px rgba(249,115,22,0.2)',
            padding: '12px 18px',
            fontSize: '0.9rem',
            color: '#ffffff'
          }}
        >
          <span>{content}</span>
          {showTime && timestamp && (
            <div className="mt-1 text-xs opacity-80">
              {new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </button>
      </div>
    )
  }

  if (role === 'assistant') {
    return (
      <div className="mb-4 flex w-full justify-start gap-3">
        <span
          className="shrink-0 inline-flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            background: '#fff8f0',
            border: '1.5px solid rgba(249,115,22,0.2)',
            borderRadius: '50%'
          }}
          aria-hidden
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>👻</span>
        </span>
        <button
          type="button"
          onClick={() => setShowTime((s) => !s)}
          className="max-w-[72%] text-left font-fraunces"
          style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: '18px 18px 18px 4px',
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(249,115,22,0.03)',
            padding: '14px 18px',
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: '#1c1917'
          }}
        >
          <span>{content}</span>
          {showTime && timestamp && (
            <div className="mt-1 text-xs text-neutral-500">
              {new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </div>
          )}
        </button>
      </div>
    )
  }

  return null
}
