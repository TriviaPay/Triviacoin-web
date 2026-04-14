import { useCallback, memo } from 'react'
import { Particles } from 'react-tsparticles'
import type { Engine, ISourceOptions } from 'tsparticles-engine'
import { loadSlim } from 'tsparticles-slim'
import { useMemo } from 'react'

const HeroParticles = () => {
  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: { enable: false },
      background: { color: 'transparent' },
      particles: {
        number: { value: 24, density: { enable: true, area: 600 } },
        color: { value: ['#9bd6ff', '#fce38a', '#ffffff', '#b5c7f5'] },
        opacity: { value: { min: 0.15, max: 0.35 } },
        shape: {
          type: 'char',
          options: {
            char: {
              value: ['?', '💬'],
              font: 'Verdana',
              style: '',
              weight: '400',
            },
          },
        },
        size: { value: { min: 14, max: 24 } },
        move: { enable: true, speed: 0.6, random: true, outModes: { default: 'bounce' } },
      },
      detectRetina: true,
    }),
    [],
  )

  const init = async (engine: Engine) => {
    await loadSlim(engine)
  }

  return (
    <Particles
      id="hero-particles"
      init={init}
      options={options}
      className="pointer-events-none absolute inset-0"
    />
  )
}

export default HeroParticles
