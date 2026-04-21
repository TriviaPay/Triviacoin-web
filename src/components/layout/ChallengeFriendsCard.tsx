import Button from '../ui/Button'
import { FacebookIcon } from '../icons/TriviaIcons'
import boyImg from '../../assets/boy.jpg'
import girlImg from '../../assets/girl.jpg'

type Props = {
  onPlayAgain: () => void
  onShare?: () => void
}

const ChallengeFriendsCard = ({ onPlayAgain, onShare }: Props) => (
  <section className="section-card flex min-h-[320px] w-full flex-col rounded-3xl bg-cream bg-dots text-[#0b2a6c] shadow-[0_16px_32px_rgba(0,0,0,0.18)] border border-[#e5d4b8]">
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div>
        <h3 className="text-xl font-display text-[#0b2a6c]">Challenge Your Friends!</h3>
        <p className="mt-1 text-sm text-[#4d4d6a]">Invite Your Friends to a Trivia Battle!</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        <img src={boyImg} alt="You" className="h-20 w-20 rounded-full border-4 border-[#4fa9ff] shadow-glow object-cover" />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1e40af] text-lg font-bold text-white shadow-soft">
          VS
        </div>
        <img src={girlImg} alt="Emily" className="h-20 w-20 rounded-full border-4 border-[#f55b6a] shadow-glow object-cover" />
      </div>

      <div className="mt-2 flex w-full flex-col gap-2">
        <Button onClick={onPlayAgain} className="w-full rounded-full px-4 py-2 text-xs sm:text-sm uppercase">
          Play Again
        </Button>
        <Button
          onClick={onShare}
          variant="secondary"
          className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm uppercase"
        >
          <FacebookIcon />
          Share Results
        </Button>
      </div>
    </div>
  </section>
)

export default ChallengeFriendsCard
