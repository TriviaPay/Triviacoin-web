import type { FreeModeQuestion } from '../store/triviaSlice'

/** Map stored answer (letter or text) to option label for display. */
export function displayFreeAnswerText(q: FreeModeQuestion, raw: string | null | undefined): string {
  if (raw == null || raw === '') return '—'
  const normalized = String(raw).toLowerCase().trim()
  if (normalized === 'a') return q.option_a
  if (normalized === 'b') return q.option_b
  if (normalized === 'c') return q.option_c
  if (normalized === 'd') return q.option_d
  const t = String(raw).toLowerCase().trim()
  for (const text of [q.option_a, q.option_b, q.option_c, q.option_d]) {
    if (String(text).toLowerCase().trim() === t) return text
  }
  return String(raw)
}

export function displayYourAnswer(q: FreeModeQuestion): string {
  return displayFreeAnswerText(q, q.fill_in_answer)
}

export function displayCorrectAnswerLine(q: FreeModeQuestion): string {
  return displayFreeAnswerText(q, q.correct_answer)
}

/** Resolve stored answer to option id a–d for styling. */
export function optionIdFromStoredAnswer(
  q: FreeModeQuestion,
  raw: string | null | undefined
): 'a' | 'b' | 'c' | 'd' | null {
  if (raw == null || raw === '') return null
  const normalized = String(raw).toLowerCase().trim()
  if (normalized === 'a' || normalized === 'b' || normalized === 'c' || normalized === 'd') {
    return normalized as 'a' | 'b' | 'c' | 'd'
  }
  const map = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d } as const
  for (const [id, text] of Object.entries(map)) {
    const t = String(text ?? '').toLowerCase().trim()
    if (!t) continue
    if (t === normalized || t.includes(normalized) || normalized.includes(t)) return id as 'a' | 'b' | 'c' | 'd'
  }
  return null
}
