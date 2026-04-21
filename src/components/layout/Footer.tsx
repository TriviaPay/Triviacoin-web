import triviaLogo from '../../assets/triviaLogo.png'

/**
 * Simplified Footer with Legal links and Branding.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-4 py-8 pb-16 text-center">
      <div className="mx-auto max-w-screen-2xl px-6 space-y-5">
        {/* Line 1: Logo and Brand */}
        <div className="flex items-center justify-center gap-3">
          <img src={triviaLogo} alt="Trivia Coin" className="h-8 w-auto object-contain brightness-110" />
          <span className="font-display text-lg font-black tracking-tight text-white/90">Trivia Coin</span>
        </div>

        {/* Line 2: Legal Links (Details) */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-bold tracking-widest text-white/40 uppercase">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <span className="h-3 w-px bg-white/10 hidden sm:block" />
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <span className="h-3 w-px bg-white/10 hidden sm:block" />
          <a href="#" className="hover:text-white transition-colors">Acceptable Use</a>
        </div>

        {/* Line 3: Copyright and Contact */}
        <div className="flex flex-col items-center justify-center gap-2 pt-1">
          <p className="text-[10px] font-medium tracking-wide text-white/25 uppercase">
            Copyright © {year} <span className="text-white/40">Miragaming</span>. All rights reserved.
          </p>
          <a href="mailto:support@triviacoin.ai" className="text-[10px] lowercase text-[#3b82f6]/70 hover:text-[#3b82f6] hover:underline">
            support@triviacoin.ai
          </a>
        </div>
      </div>
    </footer>
  )
}
