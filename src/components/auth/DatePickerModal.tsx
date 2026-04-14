import React, { useMemo, useState, useCallback } from 'react'

type Props = {
  open: boolean
  value?: string
  onSelect: (date: string) => void
  onClose: () => void
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const parseDate = (input?: string) => {
  if (!input) return new Date()
  const [y, m, d] = input.split('-').map(Number)
  if (y && m && d) return new Date(y, m - 1, d)
  return new Date(input)
}

const DatePickerModal: React.FC<Props> = ({ open, value, onClose, onSelect }) => {
  const initial = useMemo(() => parseDate(value), [value])
  const [cursor, setCursor] = useState(initial)
  const [selectedDay, setSelectedDay] = useState(initial.getDate())
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const grid = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1))

  const formatDate = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const handleConfirm = useCallback(() => {
    const formatted = formatDate(year, month, selectedDay)
    onSelect(formatted)
    onClose()
  }, [year, month, selectedDay, onSelect, onClose])

  const years = useMemo(() => Array.from({ length: 51 }, (_, i) => 1975 + i), [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] overflow-hidden">
        {/* Month/Year header - only when no picker */}
        {!showMonthPicker && !showYearPicker && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <button
              className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/20"
              onClick={() => setCursor(new Date(year, month - 1, selectedDay))}
            >
              ‹
            </button>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20 font-semibold"
                onClick={() => { setShowMonthPicker(true); setShowYearPicker(false); }}
              >
                {monthNames[month]}
              </button>
              <button
                className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/20 font-semibold"
                onClick={() => { setShowYearPicker(true); setShowMonthPicker(false); }}
              >
                {year}
              </button>
            </div>
            <button
              className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/20"
              onClick={() => setCursor(new Date(year, month + 1, selectedDay))}
            >
              ›
            </button>
          </div>
        )}

        {/* Month picker */}
        {showMonthPicker && (
          <div className="p-5">
            <h3 className="text-center text-sm font-semibold text-white/90 mb-3">Select Month</h3>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {monthNames.map((name, idx) => (
                <button
                  key={name}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    idx === month ? 'bg-white text-[#0c3c89]' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  onClick={() => {
                    setCursor(new Date(year, idx, Math.min(selectedDay, new Date(year, idx + 1, 0).getDate())))
                    setShowMonthPicker(false)
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Year picker */}
        {showYearPicker && (
          <div className="p-5">
            <h3 className="text-center text-sm font-semibold text-white/90 mb-3">Select Year</h3>
            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
              {years.map((y) => (
                <button
                  key={y}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    y === year ? 'bg-white text-[#0c3c89]' : 'bg-white/10 hover:bg-white/20'
                  }`}
                  onClick={() => {
                    setCursor(new Date(y, month, Math.min(selectedDay, new Date(y, month + 1, 0).getDate())))
                    setShowYearPicker(false)
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Calendar grid - only when no picker */}
        {!showMonthPicker && !showYearPicker && (
          <>
            <div className="grid grid-cols-7 gap-2 px-4 py-2 text-center text-xs uppercase tracking-wide text-white/70">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2 px-4 pb-4">
              {grid.map((day, idx) => (
                <button
                  key={idx}
                  disabled={!day}
                  className={`aspect-square rounded-lg text-sm font-semibold transition ${
                    day === selectedDay
                      ? 'bg-white text-[#0c3c89] shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } ${!day ? 'cursor-default opacity-0' : ''}`}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day || ''}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0c3c89] hover:brightness-95"
            onClick={handleConfirm}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}

export default DatePickerModal
