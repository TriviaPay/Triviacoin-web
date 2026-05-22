import closeIconPng from '../../assets/closeIcon.png'

type Props = {
  className?: string
}

/** Close control image from `src/assets/closeIcon.png`. */
export default function CloseIcon({ className = 'h-5 w-5 shrink-0 object-contain' }: Props) {
  return <img src={closeIconPng} alt="" className={className} aria-hidden />
}
