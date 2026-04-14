type Props = {
  value: number
  max: number
}

const ProgressBar = ({ value, max }: Props) => {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-3 w-full rounded-full bg-[#0a306e] shadow-inner ring-1 ring-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#65c5ff] via-[#1f83f3] to-[#0c63d6] shadow-[0_6px_14px_rgba(79,169,255,0.45)] transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export default ProgressBar
