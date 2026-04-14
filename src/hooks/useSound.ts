import { useCallback, useEffect, useMemo } from 'react'
import { Howl, Howler } from 'howler'
import gameMusic from '../assets/sounds/game.mp3'
import { useAppSelector } from '../store/store'

// Disable Howler's autoUnlock so we control resume inside a real user gesture
Howler.autoUnlock = false
Howler.html5PoolSize = 1

type SoundKind = 'click' | 'correct' | 'wrong'

let bgHowl: Howl | null = null
const BASE_VOL = 0.32

const ensureBg = () => {
  if (bgHowl && (bgHowl as any)._html5) {
    // clean up old HTML5 instance that could exhaust the pool
    bgHowl.unload()
    bgHowl = null
  }
  if (!bgHowl) {
    bgHowl = new Howl({
      src: [gameMusic],
      loop: true,
      volume: BASE_VOL,
      preload: true,
      html5: false, // prefer WebAudio to avoid HTML5 pool exhaustion
    })
  }
  return bgHowl
}

const buildTone = (freq: number, duration = 0.2, volume = 0.45) => {
  const sampleRate = 44100
  const samples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i))
  }

  write(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  write(8, 'WAVEfmt ')
  view.setUint32(16, 16, true) // PCM header length
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // channels
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  write(36, 'data')
  view.setUint32(40, samples * 2, true)

  for (let i = 0; i < samples; i += 1) {
    const amplitude = Math.sin((2 * Math.PI * freq * i) / sampleRate) * volume
    view.setInt16(44 + i * 2, amplitude * 32767, true)
  }

  const bytes = new Uint8Array(buffer)
  const base64 = window.btoa(String.fromCharCode(...Array.from(bytes)))
  return `data:audio/wav;base64,${base64}`
}

export const useSound = () => {
  const soundEnabled = useAppSelector((s) => s.ui.soundEnabled)

  const sounds = useMemo(
    () => ({
      click: new Howl({ src: [buildTone(660, 0.12, 0.35)] }),
      correct: new Howl({ src: [buildTone(880, 0.22, 0.5)] }),
      wrong: new Howl({ src: [buildTone(280, 0.28, 0.55)] }),
    }),
    [],
  )

  // Create the bg Howl once
  useEffect(() => {
    ensureBg()
  }, [])

  // Handle loop state when soundEnabled changes, but never auto-start without a user gesture.
  useEffect(() => {
    const bg = ensureBg()
    if (!soundEnabled) {
      const currentVol = bg.volume()
      if (bg.playing()) {
        bg.fade(currentVol, 0, 180)
        bg.once('fade', () => bg.pause())
      }
      return
    }

    const ctx = Howler.ctx
    // Only start if context already running (i.e., user gesture happened).
    if (ctx && ctx.state === 'running') {
      if (!bg.playing()) {
        bg.volume(BASE_VOL)
        const id = bg.play()
        if (id !== null) bg.fade(0, BASE_VOL, 400, id)
        bg.once('play', () => {})
        bg.once('playerror', () => {})
      } else {
        bg.volume(BASE_VOL)
      }
    }
  }, [soundEnabled])

  const play = useCallback((sound: SoundKind) => sounds[sound].play(), [sounds])

  const playBg = useCallback(async () => {
    const bg = ensureBg()
    const ctx = Howler.ctx
    if (!soundEnabled) return
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch (e) {
        return
      }
    }
    if (ctx && ctx.state !== 'running') return
    if (!bg.playing()) {
      bg.volume(BASE_VOL)
      bg.play()
    } else {
      bg.volume(BASE_VOL)
    }
  }, [soundEnabled])

  const stopBg = useCallback(() => {
    const bg = ensureBg()
    bg.pause()
  }, [])

  const bgPlaying = useCallback(() => {
    const bg = ensureBg()
    return bg.playing()
  }, [])

  return {
    playClick: () => play('click'),
    playCorrect: () => play('correct'),
    playWrong: () => play('wrong'),
    playTick: () => {}, // timer sound removed
    playBg,
    stopBg,
    bgPlaying,
  }
}
