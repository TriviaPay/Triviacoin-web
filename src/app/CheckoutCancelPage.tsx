import { Link } from 'react-router-dom'

export default function CheckoutCancelPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a1628] px-4 py-24 text-white">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <h1 className="font-display text-2xl font-bold text-[#ffd66b]">Payment cancelled</h1>
        <p className="mt-4 text-sm text-white/75">
          You left checkout before completing payment. No charge was made.
        </p>
        <Link to="/" className="mt-8 inline-block text-sm font-semibold text-[#93c5fd] underline">
          Back to app
        </Link>
      </div>
    </div>
  )
}
