import Button from '../ui/Button'
import { useAppDispatch } from '../../store/store'
import { setReferralModalOpen, setSupportModalOpen } from '../../store/uiSlice'

export const AppleStoreIcon = ({ className = 'h-5 w-5 fill-current' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.062 13.922c.031 2.375 2.062 3.188 2.094 3.219-.031.062-.312.938-.938 1.844-.562.812-1.125 1.625-2.031 1.625-.875 0-1.156-.531-2.156-.531-1.031 0-1.344.531-2.156.531-.844 0-1.5-.75-2.125-1.656-1.281-1.844-2.25-5.188-.938-7.438.656-1.125 1.813-1.813 3.031-1.813 1 0 1.938.688 2.531.688.594 0 1.719-.844 2.906-.719.5.031 1.906.219 2.813 1.531-.062.062-1.656.969-1.631 2.719ZM14.187 6.422C14.625 5.906 14.938 5.188 14.844 4.469c-.625.031-1.406.406-1.844.938-.406.438-.75 1.188-.656 1.875.719.062 1.406-.312 1.843-.86Z" />
  </svg>
)

export const PlayStoreIcon = ({ className = 'h-5 w-5 fill-current' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M5.143 2.545c-.24.238-.376.586-.376.994V20.46c0 .408.136.756.376.994L5.214 21.52l9.02-9.021v-.152l-9.02-9.02-.07.018ZM15.688 12.35l3.568 2.025c1.025.58 1.025 1.53 0 2.112l-3.568 2.025-1.047-1.047 3.541-3.111-3.541-3.11 1.047-1.047ZM14.641 11.303 5.484 3.125c-.244-.216-.481-.252-.733-.117l9.89 9.89 1.047-1.047-.047-.548ZM14.641 12.697l-1.047-1.047-9.89 9.89c.252.135.489.099.733-.117l9.157-8.178.047-.548Z" />
  </svg>
)

const SupportCard = () => {
  const dispatch = useAppDispatch()
  return (
    <section className="section-card flex min-h-[320px] w-full flex-col rounded-3xl bg-cream bg-dots text-[#0b2a6c] shadow-[0_16px_32px_rgba(0,0,0,0.18)] border border-[#e5d4b8]">
      <div className="flex flex-1 flex-col gap-4">
        <div className="text-center">
          <h3 className="text-xl font-display text-[#0b2a6c]">Customer Support</h3>
        </div>

        <p className="text-center text-sm font-medium leading-relaxed text-[#0b2a6c]/80">
          Need help or have questions? Contact our support team directly or download our mobile apps for the best experience.
        </p>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-[#0d3e92] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#0b2a6c] hover:shadow-lg active:scale-95"
          >
            <AppleStoreIcon />
            iOS App
          </a>
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full bg-[#0d3e92] px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#0b2a6c] hover:shadow-lg active:scale-95"
          >
            <PlayStoreIcon />
            Android App
          </a>
        </div>

        <div className="mt-auto flex flex-col items-center gap-3">
          <Button
            onClick={() => dispatch(setReferralModalOpen(true))}
            className="w-full max-w-xs rounded-full px-4 py-3 text-sm font-semibold uppercase shadow-md active:scale-95"
          >
            Refer a Friend
          </Button>
          <Button
            variant="secondary"
            onClick={() => dispatch(setSupportModalOpen(true))}
            className="w-full max-w-xs rounded-full bg-[#0d3e92] py-2.5 text-xs font-semibold uppercase text-white shadow-md active:scale-95 transition-all hover:bg-[#0b2a6c]"
          >
            Email Support
          </Button>
        </div>
      </div>
    </section>
  )
}

export default SupportCard
