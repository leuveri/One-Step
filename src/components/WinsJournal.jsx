import React from 'react'

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return ''
  }
}

export default function WinsJournal({ open, onClose, entries, onDelete }) {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-cream/95 px-4 py-6 shadow-xl transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📓</span>
          <h2 className="font-heading text-lg font-semibold text-warmText">
            Your wins. For the hard days.
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-200/70"
        >
          ×
        </button>
      </div>

      {(!entries || entries.length === 0) && (
        <p className="mt-8 text-sm text-neutral-600">
          Your wins will live here. Start something. 💛
        </p>
      )}

      <div className="mt-2 space-y-4 overflow-y-auto pr-2 text-sm">
        {entries
          .slice()
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .map((entry, idx) => (
            <div
              key={entry.id || `${entry.timestamp}-${idx}`}
              className="relative rounded-md bg-white/90 p-3 shadow-sm"
            >
              <button
                type="button"
                onClick={() => onDelete && onDelete(entry)}
                className="absolute right-2 top-2 text-xs text-neutral-500 hover:text-neutral-800"
              >
                ×
              </button>
              <div className="mb-1 text-xs uppercase tracking-wide text-amberAccent">
                {entry.task != null && entry.date
                  ? new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' })
                  : formatDate(entry.timestamp)}
              </div>
              <div className="mb-1 text-[13px] font-medium text-warmText">
                {entry.task != null ? entry.task : entry.goal}
              </div>
              {(entry.firstStep ?? entry.step) && (
                <div className="mb-1 text-[13px] text-neutral-700">
                  Step: <span className="italic">&quot;{entry.firstStep ?? entry.step}&quot;</span>
                </div>
              )}
              {entry.task == null && entry.phrase && (
                <div className="text-[12px] text-neutral-600">
                  {entry.phrase}
                </div>
              )}
              {entry.task != null && entry.messageCount != null && (
                <div className="text-[12px] text-neutral-500">
                  {entry.messageCount} messages
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
