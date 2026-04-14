/** Compare semver-like strings (e.g. 1.0.5). Returns positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const parse = (s: string) =>
    s
      .trim()
      .split(/[._-]/)
      .map((p) => {
        const n = parseInt(p, 10)
        return Number.isFinite(n) ? n : 0
      })
  const pa = parse(a)
  const pb = parse(b)
  const n = Math.max(pa.length, pb.length)
  for (let i = 0; i < n; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}
