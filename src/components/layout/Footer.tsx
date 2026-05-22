import triviaLogo from '../../assets/triviaLogo.png'

/**
 * Simplified Footer with Legal links and Branding.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative mt-4 py-6 pb-14 text-center sm:py-8 sm:pb-16">
      <div className="mx-auto max-w-screen-2xl space-y-4 px-4 sm:space-y-5 sm:px-6">
        <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-3">
          <img src={triviaLogo} alt="Trivia Coin" className="h-7 w-auto object-contain brightness-110 sm:h-8" />
          <span className="type-card-title font-black tracking-tight text-white/90">Trivia Coin</span>
        </div>

        <div className="type-caption flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <a href="#" className="hover:text-white transition-colors">Acceptable Use</a>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 pt-1">
          <p className="type-caption font-medium normal-case tracking-wide text-white/25">
            Copyright © {year} <span className="text-white/40">Miragaming</span>. All rights reserved.
          </p>
          <a href="mailto:support@triviacoin.ai" className="text-fluid-xs lowercase text-[#3b82f6]/70 hover:text-[#3b82f6] hover:underline">
            support@triviacoin.ai
          </a>
        </div>
      </div>
    </footer>
  )
}
