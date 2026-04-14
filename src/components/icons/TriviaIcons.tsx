type IconProps = {
  className?: string
}

export const BrainFlameIcon = ({ className = 'h-8 w-8 text-white' }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="url(#grad1)" />
    <path
      d="M32 14c4 6 2 10-1 13 3 0 6 2 6 6 0 5-3 9-7 9s-9-3-9-10c0-6 4-10 11-18Z"
      fill="#ffce73"
    />
    <path d="M29 42c-1-2-1-4 1-6 0 2 2 3 4 3-1 2-2 3-5 3Z" fill="#f59f43" />
    <defs>
      <linearGradient id="grad1" x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffb43b" />
        <stop offset="1" stopColor="#f78a1d" />
      </linearGradient>
    </defs>
  </svg>
)

export const TrophyIcon = ({ className = 'h-8 w-8 text-white' }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="trophyBody" x1="18" y1="10" x2="46" y2="52" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffd66b" />
        <stop offset="1" stopColor="#f3a011" />
      </linearGradient>
    </defs>
    <path d="M20 12h24v12c0 9-5 16-12 18-7-2-12-9-12-18V12Z" fill="url(#trophyBody)" />
    <path d="M24 46h16v4H24z" fill="#e08c0e" />
    <rect x="28" y="50" width="8" height="4" rx="1.5" fill="#c76e00" />
    <path d="M20 16H12c0 8 5 12 8 12v-4c-2-1-3-3-4-5h4v-3Zm24 0h8c0 8-5 12-8 12v-4c2-1 3-3 4-5h-4v-3Z" fill="#f7b52c" />
  </svg>
)

export const TrophyStarIcon = ({ className = 'h-8 w-8 text-white' }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="url(#trophyStarBg)" />
    <path
      d="M32 15 36 25l11 1-9 7 3 11-9-6-9 6 3-11-9-7 11-1 3-10Z"
      fill="#ffe27a"
      stroke="#f3a011"
      strokeWidth="2"
    />
    <defs>
      <linearGradient id="trophyStarBg" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffd66b" />
        <stop offset="1" stopColor="#f3a011" />
      </linearGradient>
    </defs>
  </svg>
)

export const CheckIcon = ({ className = 'h-5 w-5 fill-current' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M20.485 6.515a1.25 1.25 0 0 1 0 1.77l-9 9a1.25 1.25 0 0 1-1.77 0l-4-4a1.25 1.25 0 0 1 1.77-1.77l3.115 3.115 8.115-8.115a1.25 1.25 0 0 1 1.77 0Z"
    />
  </svg>
)

export const CheckCircleIcon = ({ className = 'h-5 w-5 fill-current' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.25a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5ZM5.97 12.53a.75.75 0 0 1 1.06-.06l2.7 2.43 6.24-6.39a.75.75 0 0 1 1.08 1.04l-6.76 6.92a.75.75 0 0 1-1.06.02l-3.24-2.91a.75.75 0 0 1-.06-1.05Z"
    />
  </svg>
)

export const LightningIcon = ({ className = 'h-5 w-5 fill-current' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M13.5 2 5 14h6l-1 8 8.5-12h-6l1-8Z" />
  </svg>
)

/** 3D Brain + Lightbulb logo for navbar - Trivia Quest */
export const BrainLightbulbIcon = ({ className = 'h-8 w-8' }: IconProps) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="navBrain" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7ec8ff" />
        <stop offset="0.5" stopColor="#4a9eff" />
        <stop offset="1" stopColor="#1a7de8" />
      </linearGradient>
      <linearGradient id="navBulb" x1="20" y1="24" x2="28" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff4c4" />
        <stop offset="0.4" stopColor="#ffd54f" />
        <stop offset="1" stopColor="#f9a825" />
      </linearGradient>
      <filter id="navIconShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="1" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Brain outline - simplified */}
    <path
      d="M24 10c-6 0-10 5-10 10 0 3 1.5 5.5 4 7v2c0 1 .9 2 2 2h8c1.1 0 2-.9 2-2v-2c2.5-1.5 4-4 4-7 0-5-4-10-10-10z"
      fill="url(#navBrain)"
      stroke="#0d5fc4"
      strokeWidth="1.5"
      filter="url(#navIconShadow)"
    />
    {/* Lightbulb base */}
    <path
      d="M24 26l-1.5 4h3L24 26z"
      fill="url(#navBulb)"
      stroke="#d4890a"
      strokeWidth="0.5"
    />
    <path
      d="M24 28c1.5 0 2.5 1 2.5 2.5v1.5c0 .7-.6 1.2-1.2 1.2h-2.6c-.6 0-1.2-.5-1.2-1.2v-1.5c0-1.5 1-2.5 2.5-2.5z"
      fill="url(#navBulb)"
      stroke="#d4890a"
      strokeWidth="0.5"
    />
    <ellipse cx="24" cy="36" rx="2.5" ry="1.2" fill="#f9a825" />
  </svg>
)

export const FacebookIcon = ({ className = 'h-5 w-5 fill-current' }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M13 10h2.5l.5-3H13V5.5c0-.9.3-1.5 1.6-1.5H16V1.1C15.7 1 14.6 1 13.4 1 10.6 1 9 2.7 9 5.2V7H6.5v3H9v8h4v-8Z" />
  </svg>
)

/** 3D Brain mascot with glasses holding quiz cards - as shown in design */
export const BrainMascotIcon = ({ className = 'h-56 w-auto' }: IconProps) => (
  <svg viewBox="0 0 320 340" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="brainBody3d" x1="50" y1="30" x2="270" y2="310" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffc4d4" />
        <stop offset="0.3" stopColor="#ff9eb5" />
        <stop offset="0.7" stopColor="#ff7a96" />
        <stop offset="1" stopColor="#e85a78" />
      </linearGradient>
      <linearGradient id="brainShadow" x1="160" y1="0" x2="160" y2="320" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff7a96" stopOpacity="0.4" />
        <stop offset="1" stopColor="#c44a62" stopOpacity="0.2" />
      </linearGradient>
      <filter id="brainDropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.35" />
      </filter>
      <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#fff4c4" />
        <stop offset="0.5" stopColor="#ffd66b" />
        <stop offset="1" stopColor="#e6a019" />
      </linearGradient>
      <filter id="cardShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.3" />
      </filter>
    </defs>
    {/* 3D brain body with depth */}
    <ellipse cx="160" cy="158" rx="118" ry="108" fill="url(#brainShadow)" transform="translate(0 6)" />
    <ellipse cx="160" cy="155" rx="120" ry="110" fill="url(#brainBody3d)" stroke="#d64a68" strokeWidth="4" filter="url(#brainDropShadow)" />
    {/* Brain wrinkles for 3D effect */}
    <path d="M70 140 Q90 120 110 135 Q130 150 150 140" stroke="#e85a78" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
    <path d="M210 140 Q230 120 250 135 Q270 150 250 165" stroke="#e85a78" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
    {/* Glasses */}
    <path d="M95 135 Q100 128 120 130 Q140 132 160 128" stroke="#1f2b56" strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M165 128 Q185 132 205 130 Q225 128 230 135" stroke="#1f2b56" strokeWidth="8" fill="none" strokeLinecap="round" />
    <path d="M160 128 L160 142" stroke="#1f2b56" strokeWidth="6" />
    <circle cx="120" cy="145" r="28" fill="none" stroke="#1f2b56" strokeWidth="6" />
    <circle cx="200" cy="145" r="28" fill="none" stroke="#1f2b56" strokeWidth="6" />
    <circle cx="120" cy="145" r="14" fill="#5bb8ff" fillOpacity="0.3" />
    <circle cx="200" cy="145" r="14" fill="#5bb8ff" fillOpacity="0.3" />
    <circle cx="120" cy="145" r="10" fill="#1f2b56" />
    <circle cx="200" cy="145" r="10" fill="#1f2b56" />
    {/* Smile */}
    <path d="M130 195 Q160 220 190 195" stroke="#1f2b56" strokeWidth="8" fill="none" strokeLinecap="round" />
    {/* Left quiz card */}
    <g filter="url(#cardShadow)" transform="translate(55, 210) rotate(-12)">
      <rect width="52" height="38" rx="6" fill="url(#cardGrad)" stroke="#d4a017" strokeWidth="2" />
      <text x="26" y="26" textAnchor="middle" fill="#1f2b56" fontFamily="Baloo 2, sans-serif" fontWeight="700" fontSize="18">?</text>
    </g>
    {/* Right quiz card */}
    <g filter="url(#cardShadow)" transform="translate(213, 210) rotate(12)">
      <rect width="52" height="38" rx="6" fill="url(#cardGrad)" stroke="#d4a017" strokeWidth="2" />
      <text x="26" y="26" textAnchor="middle" fill="#1f2b56" fontFamily="Baloo 2, sans-serif" fontWeight="700" fontSize="18">?</text>
    </g>
  </svg>
)

export const AvatarYouIcon = ({ className = 'h-16 w-16' }: IconProps) => (
  <svg viewBox="0 0 160 160" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="76" fill="#4fa9ff" />
    <circle cx="80" cy="70" r="32" fill="#ffe4c4" />
    <path d="M44 118c8-18 24-26 36-26s28 8 36 26" fill="#ffe4c4" />
    <path d="M92 46c-8 0-12 4-24 4-8 0-14-2-18 4-4 6-4 22 2 34-10-6-14-22-10-34 6-18 22-28 40-28 18 0 32 10 38 26 4 12 0 26-8 32 4-12 6-28 0-34-8-6-14-4-20-4Z" fill="#1f2b56" />
    <circle cx="64" cy="72" r="6" fill="#1f2b56" />
    <circle cx="98" cy="72" r="6" fill="#1f2b56" />
    <path d="M68 92c6 6 18 6 24 0" stroke="#e45b7a" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

export const AvatarEmilyIcon = ({ className = 'h-16 w-16' }: IconProps) => (
  <svg viewBox="0 0 160 160" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="76" fill="#f55b6a" />
    <circle cx="80" cy="70" r="32" fill="#ffe4c4" />
    <path d="M48 118c8-18 22-26 32-26s24 8 32 26" fill="#ffe4c4" />
    <path d="M46 68c2-20 16-34 34-34 20 0 34 14 36 36 2 10-2 22-8 28 4-12 2-26-6-32-10-8-22-4-30-4-10 0-18-4-24 2-6 6-8 18-6 30-8-6-10-18-8-26Z" fill="#d85c45" />
    <circle cx="64" cy="72" r="6" fill="#1f2b56" />
    <circle cx="98" cy="72" r="6" fill="#1f2b56" />
    <path d="M70 90c6 6 16 6 22 0" stroke="#e45b7a" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

export const ChevronRightIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
