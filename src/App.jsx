import React, { useEffect, useState } from 'react'
import ChatScreen from './screens/ChatScreen.jsx'
import WinsJournal from './components/WinsJournal.jsx'

const STORAGE_KEY = 'onestep_state_v1'
const todayKey = () => new Date().toISOString().slice(0, 10)

const initialState = {
  winsJournal: [],
  streak: 0,
  bodyDoubleCount: 0
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: initialState, meta: {} }
    const parsed = JSON.parse(raw)
    const { state, meta } = parsed
    return {
      state: { ...initialState, ...(state || {}) },
      meta: meta || {}
    }
  } catch {
    return { state: initialState, meta: {} }
  }
}

export default function App() {
  const [{ state, meta }, setAll] = useState(() => loadPersisted())
  const [journalOpen, setJournalOpen] = useState(false)

  useEffect(() => {
    const today = todayKey()
    const lastUsed = meta.lastUsedDate
    let streak = state.streak || 0

    if (!lastUsed) {
      streak = streak || 1
    } else if (lastUsed !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yKey = yesterday.toISOString().slice(0, 10)
      streak = lastUsed === yKey ? (streak || 0) + 1 : 1
    }

    setAll((prev) => {
      const nextState = { ...prev.state, streak }
      const nextMeta = { ...prev.meta, lastUsedDate: today }
      const toStore = { state: nextState, meta: nextMeta }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
      return { state: nextState, meta: nextMeta }
    })
  }, [])

  useEffect(() => {
    const toStore = { state, meta }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // ignore
    }
  }, [state, meta])

  const handleSaveWin = (win) => {
    const entry = {
      ...win,
      id: win.id || `win-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    }
    setAll((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        winsJournal: [...(prev.state.winsJournal || []), entry]
      }
    }))
  }

  const handleDeleteWin = (entry) => {
    setAll((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        winsJournal: (prev.state.winsJournal || []).filter((w) => w.id !== entry.id)
      }
    }))
  }

  return (
    <>
      <ChatScreen
        onOpenJournal={() => setJournalOpen(true)}
        bodyDoubleCount={state.bodyDoubleCount}
        setBodyDoubleCount={(n) =>
          setAll((prev) => ({
            ...prev,
            state: { ...prev.state, bodyDoubleCount: n }
          }))
        }
        streak={state.streak}
        winsJournal={state.winsJournal || []}
        onSaveWin={handleSaveWin}
        onDeleteWin={handleDeleteWin}
      />
      <WinsJournal
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        entries={state.winsJournal || []}
        onDelete={handleDeleteWin}
      />
    </>
  )
}
