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
  onSaveWin
}) {
  const [messages, setMessages] = useState([])
  const [task, setTask] = useState('')
  const [awaitingWrapup, setAwaitingWrapup] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [inputDisabled, setInputDisabled] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [input, setInput] = useState('')

  const checkinTimerRef = useRef(null)
  const scrollBottomRef = useRef(null)
  const taskRef = useRef(task)
  const messagesRef = useRef(messages)

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
      return
    }

    const wrapupPhrases = ["feel like that's enough", 'enough for today', 'you good?']
    const isWrapupQuestion = wrapupPhrases.some((p) =>
      responseText.toLowerCase().includes(p)
    )
    setAwaitingWrapup(isWrapupQuestion)

    addMessage({ role: 'assistant', content: responseText })

    if (!isFirstMessage) resetCheckinTimer()
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

  return (
    <div className="flex h-screen w-full max-w-[680px] flex-col bg-cream mx-auto">
      <header className="grid shrink-0 grid-cols-3 items-center gap-2 border-b border-amber-200/50 bg-cream px-5 py-4 md:px-6">
        <h1 className="font-heading text-xl font-bold text-warmText">OneStep</h1>
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

      <div className="chat-scroll flex-1 overflow-y-auto px-5 py-6 md:px-6">
        {messages.length === 0 && !isTyping && (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center gap-10">
            <div className="px-2">
              <p className="font-heading text-4xl font-bold text-warmText md:text-5xl">
                hey 👋 what are we tackling today?
              </p>
              <p className="mt-5 text-lg text-neutral-500 max-w-md mx-auto">
                tell me what you&apos;ve been avoiding — i&apos;ll help you take one tiny step
              </p>
            </div>
            <div className="w-full max-w-[560px] mx-auto flex flex-col items-stretch gap-3">
              <button
                type="button"
                onClick={() => handleExampleClick("reply to that email I've been avoiding")}
                className="w-full rounded-full border border-amberAccent/70 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 hover:border-amberAccent transition-colors"
              >
                reply to that email I&apos;ve been avoiding
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('start cleaning my room')}
                className="w-full rounded-full border border-amberAccent/70 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 hover:border-amberAccent transition-colors"
              >
                start cleaning my room
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('work on my project for 10 minutes')}
                className="w-full rounded-full border border-amberAccent/70 bg-amber-50 px-6 py-3 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100 hover:border-amberAccent transition-colors"
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
            <span className="text-2xl">🧠</span>
            <span className="flex gap-0.5 font-body text-sm text-neutral-500">
              <span className="typing-dot">.</span>
              <span className="typing-dot animation-delay-200">.</span>
              <span className="typing-dot animation-delay-400">.</span>
            </span>
          </div>
        )}
        <div ref={scrollBottomRef} />
      </div>

      <div className="shrink-0 border-t border-amber-200/50 bg-cream px-5 py-4 md:px-6">
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
            className="flex-1 rounded-full border border-neutral-200 bg-white px-5 py-4 text-base text-warmText outline-none placeholder:text-neutral-400 focus:border-amberAccent focus:ring-2 focus:ring-amberAccent/30 disabled:opacity-70 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || inputDisabled}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amberAccent text-white shadow-md transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send"
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
          <p className="mt-2 text-center text-xs font-medium text-amberAccent">
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
      <p className="py-2 text-center text-xs text-neutral-500">
        {content}
      </p>
    )
  }

  if (role === 'user') {
    return (
      <div className="mb-5 flex w-full justify-end">
        <button
          type="button"
          onClick={() => setShowTime((s) => !s)}
          className="max-w-[85%] rounded-2xl rounded-br-md bg-[#f97316] px-5 py-3.5 text-left text-base text-white shadow-sm"
        >
          <span className="font-body">{content}</span>
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
      <div className="mb-5 flex w-full justify-start gap-3">
        <span className="shrink-0 text-2xl" aria-hidden>🧠</span>
        <button
          type="button"
          onClick={() => setShowTime((s) => !s)}
          className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-5 py-3.5 text-left text-base text-warmText shadow-sm"
        >
          <span className="font-heading">{content}</span>
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
