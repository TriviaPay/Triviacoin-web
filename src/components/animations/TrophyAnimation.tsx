import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import trophy from '../../assets/lottie/trophy.json'

type Props = {
  size?: number
}

const TrophyAnimation = ({ size = 220 }: Props) => {
  const [LottieComp, setLottieComp] = useState<ComponentType<any> | null>(null)
  const style = useMemo(() => ({ width: size, height: size }), [size])

  useEffect(() => {
    let mounted = true
    import('lottie-react').then((mod) => {
      if (mounted) {
        const anyMod = mod as any
        const candidate =
          (typeof anyMod === 'function' && anyMod) ||
          (typeof anyMod?.default === 'function' && anyMod.default) ||
          (typeof anyMod?.default?.default === 'function' && anyMod.default.default) ||
          (typeof anyMod?.Lottie === 'function' && anyMod.Lottie)
        if (candidate) setLottieComp(() => candidate)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  if (!LottieComp) return null
  return <LottieComp animationData={trophy} loop className="drop-shadow-glow" style={style} />
}

export default TrophyAnimation
