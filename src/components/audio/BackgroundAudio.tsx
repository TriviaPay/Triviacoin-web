import { useEffect, useRef, useState } from 'react'
import { Howler } from 'howler'
import { useSound } from '../../hooks/useSound'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { setSound } from '../../store/uiSlice'

const BackgroundAudio = () => {
  const { playBg, bgPlaying, stopBg } = useSound()
  const soundEnabled = useAppSelector((s) => s.ui.soundEnabled)
  const dispatch = useAppDispatch()
  const hooked = useRef(false)
  const [, setUnlocked] = useState(false)

  useEffect(() => {
    const onInteract = async () => {
      // run only on real user gesture
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        try {
          await Howler.ctx.resume()
        } catch (e) {
          // if resume fails, keep waiting for next gesture
          return
        }
      }
      await playBg()
      setUnlocked(true)
      teardown()
    }

    const teardown = () => {
      window.removeEventListener('pointerdown', onInteract)
      window.removeEventListener('keydown', onInteract)
      window.removeEventListener('click', onInteract)
      window.removeEventListener('touchstart', onInteract)
      hooked.current = false
    }

    if (soundEnabled && !hooked.current) {
      window.addEventListener('pointerdown', onInteract, { once: true })
      window.addEventListener('keydown', onInteract, { once: true })
      window.addEventListener('click', onInteract, { once: true })
      window.addEventListener('touchstart', onInteract, { once: true })
      hooked.current = true
    }

    return teardown
  }, [playBg, soundEnabled])

  useEffect(() => {
    if (soundEnabled && bgPlaying()) setUnlocked(true)
    else if (!soundEnabled) setUnlocked(false)
  }, [bgPlaying, soundEnabled])

  return (
    <button
      type="button"
      aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
      className={`fixed bottom-4 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full shadow-lg hover:scale-105 transition ${
        soundEnabled
          ? 'bg-[#1f2a44] text-white'
          : 'bg-gradient-to-r from-[#ffd66b] to-[#ffb347] text-[#1b2a4a]'
      }`}
      onClick={async () => {
        if (soundEnabled) {
          stopBg()
          dispatch(setSound(false))
          setUnlocked(false)
          return
        }
        dispatch(setSound(true))
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          try {
            await Howler.ctx.resume()
          } catch {
            return
          }
        }
        await playBg()
        if (bgPlaying()) setUnlocked(true)
      }}
    >
      <span aria-hidden>{soundEnabled ? '🔊' : '🔇'}</span>
    </button>
  )
}

export default BackgroundAudio
