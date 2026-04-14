type Props = {
  label: string
  value: string | number
  highlight?: boolean
}

const StatCard = ({ label, value, highlight }: Props) => (
  <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-[#134ea8] to-[#0d3e92] p-2 text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_20px_rgba(0,0,0,0.18)] border border-white/10 h-full w-full">
    <p className="text-[10px] sm:text-xs leading-tight uppercase tracking-wide text-slate px-1 w-full line-clamp-2 break-words">{label}</p>
    <div className={`mt-1.5 text-xl sm:text-2xl font-display ${highlight ? 'text-[#facc15]' : ''}`}>{value}</div>
  </div>
)

export default StatCard
