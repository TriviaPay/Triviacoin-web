import { formatSeconds } from '../../lib/utils'

type Props = { seconds: number }

const TimerPill = ({ seconds }: Props) => (
  <div className="inline-flex items-center gap-2 rounded-full bg-[#0a306e] px-4 py-2 text-sm font-semibold text-white shadow-inner ring-1 ring-white/10">
    <span className="h-2 w-2 animate-pulse rounded-full bg-[#b3e3ff]" />
    <span>{formatSeconds(seconds)}</span>
  </div>
)

export default TimerPill
