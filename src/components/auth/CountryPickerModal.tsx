import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import clsx from 'clsx'
import { fetchCountries as fetchCountriesAction } from '../../store/countrySlice'

type Props = {
  open: boolean
  selected?: string
  onSelect: (country: string) => void
  onClose: () => void
}

const CountryPickerModal: React.FC<Props> = ({ open, selected, onSelect, onClose }) => {
  const dispatch = useDispatch()
  const { list: countries = [], loading, error } = useSelector((s: any) => s.countries || {})
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open && countries.length === 0 && !loading) {
      dispatch(fetchCountriesAction() as any)
    }
  }, [open, countries.length, loading, dispatch])

  const filtered = useMemo(() => {
    if (!search.trim()) return countries
    return countries.filter((c: string) => c.toLowerCase().includes(search.toLowerCase()))
  }, [countries, search])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xl rounded-2xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
          <h2 className="text-lg font-semibold">Select Country</h2>
          <button
            aria-label="Close country picker"
            className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 ring-1 ring-white/15">
            <span className="text-white/70">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search countries"
              className="w-full bg-transparent text-sm outline-none placeholder:text-white/60"
            />
            {search && (
              <button
                type="button"
                className="text-white/70 hover:text-white"
                onClick={() => setSearch('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="py-10 text-center text-white/80">Loading countries…</div>
          ) : error ? (
            <div className="space-y-2 py-6 text-center">
              <p className="text-white/80">{error}</p>
              <button
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
                onClick={() => dispatch(fetchCountriesAction() as any)}
              >
                Retry
              </button>
            </div>
          ) : (
            filtered.map((country: string) => (
              <button
                key={country}
                className={clsx(
                  'flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition hover:bg-white/10',
                  selected === country && 'bg-white/20'
                )}
                onClick={() => {
                  onSelect(country)
                  onClose()
                }}
              >
                <span>{country}</span>
                {selected === country && <span aria-hidden>✔</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default CountryPickerModal
