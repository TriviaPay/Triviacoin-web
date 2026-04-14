import { useState } from 'react'
import Button from '../ui/Button'
import { LightningIcon, CheckCircleIcon } from '../icons/TriviaIcons'

const ChallengeCard = () => {
  const [mode, setMode] = useState<'classic' | 'lightning'>('classic')

  return (
    <section className="section-card flex min-h-[320px] w-full flex-col rounded-3xl bg-cream bg-dots text-[#0b2a6c] shadow-[0_16px_32px_rgba(0,0,0,0.18)] border border-[#e5d4b8]">
      <div className="flex flex-1 flex-col gap-4">
        <div className="text-center">
          <h3 className="text-xl font-display text-[#0b2a6c]">Challenge Your Friends!</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('classic')}
            className={`flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
              mode === 'classic'
                ? 'bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white shadow-[0_8px_16px_rgba(34,197,94,0.35)]'
                : 'bg-[#0d3e92] text-white/80'
            }`}
          >
            {mode === 'classic' && <CheckCircleIcon />}
            Classic Quiz
          </button>
          <button
            type="button"
            onClick={() => setMode('lightning')}
            className={`flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
              mode === 'lightning'
                ? 'bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white shadow-[0_8px_16px_rgba(34,197,94,0.35)]'
                : 'bg-[#0d3e92] text-white'
            }`}
          >
            {mode === 'lightning' ? <CheckCircleIcon /> : <LightningIcon />}
            Lightning Round
          </button>
        </div>

        <div className="mt-auto flex justify-center">
          <Button
            variant="secondary"
            className="w-full max-w-xs rounded-full bg-gradient-to-b from-[#3082e8] to-[#1b66c7] py-3 text-sm font-semibold uppercase text-white"
          >
            Send Invite
          </Button>
        </div>
      </div>
    </section>
  )
}

export default ChallengeCard
