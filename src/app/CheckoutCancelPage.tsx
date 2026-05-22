import { Link } from 'react-router-dom'

export default function CheckoutCancelPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a1628] px-4 py-16 sm:py-24 text-white">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <h1 className="type-section-title font-bold text-[#ffd66b] text-safe">Payment cancelled</h1>
        <p className="mt-4 type-body-sm text-white/75">
          You left checkout before completing payment. No charge was made.
        </p>
        <Link to="/" className="mt-8 inline-block text-fluid-sm font-semibold text-[#93c5fd] underline">
          Back to app
        </Link>
      </div>
    </div>
  )
}
