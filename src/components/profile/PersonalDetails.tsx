const genderOptions = ['Male', 'Female', 'Prefer not to say']

export interface Address {
  street1: string
  street2: string
  aptNumber: string
  city: string
  state: string
  country: string
  zipCode: string
}

type Props = {
  isEditing: boolean
  dob: string
  gender: string
  address: Address
  showGenderDropdown: boolean
  toggleGenderDropdown: () => void
  toggleCountryListDropdown: () => void
  handleDateSelect: () => void
  handleGenderSelect: (gender: string) => void
  handleAddressChange: (field: keyof Address, value: string) => void
  onInputFocus?: () => void
}

const PersonalDetails = ({
  isEditing,
  dob,
  gender,
  address,
  showGenderDropdown,
  toggleGenderDropdown,
  toggleCountryListDropdown,
  handleDateSelect,
  handleGenderSelect,
  handleAddressChange,
}: Props) => {
  const inputClasses =
    'w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/50 focus:border-[#ffd66b] focus:bg-white/15 focus:outline-none transition'
  const labelClasses = 'w-20 text-sm text-white/80 font-medium mr-2 flex-shrink-0'

  return (
    <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-4 mb-4">
      <div className="flex items-center mb-4">
        <div className="w-1 h-6 rounded-sm bg-[#ffd66b] mr-3" />
        <h3 className="text-base sm:text-lg font-bold text-white">Personal Details</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-[#ffd66b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-white/80">Date of Birth</span>
          </div>
          {isEditing ? (
            <button
              onClick={handleDateSelect}
              className="flex items-center justify-between border border-white/20 rounded-xl px-3 py-3 bg-white/10 min-h-[44px] w-full text-left hover:border-[#ffd66b]/50 transition text-white"
            >
              <span className={dob ? 'text-white' : 'text-white/50'}>{dob || 'Select'}</span>
              <svg className="w-5 h-5 text-[#ffd66b] ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          ) : (
            <p className="text-sm text-white/90">{dob || 'Not specified'}</p>
          )}
        </div>

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 relative">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-[#ffd66b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-semibold text-white/80">Gender</span>
          </div>
          {isEditing ? (
            <div className="relative">
              <button
                onClick={toggleGenderDropdown}
                className="flex items-center justify-between border border-white/20 rounded-xl px-3 py-3 bg-white/10 min-h-[44px] w-full text-left hover:border-[#ffd66b]/50 transition"
              >
                <span className={gender ? 'text-white' : 'text-white/50'}>{gender || 'Select'}</span>
                <svg className="w-5 h-5 text-[#ffd66b] ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showGenderDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-[#0b2a6c] border border-white/20 shadow-xl overflow-hidden z-50">
                  {genderOptions.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleGenderSelect(item)}
                      className={`block w-full text-left px-3 py-3 min-h-[42px] border-b border-white/10 last:border-0 hover:bg-white/10 transition ${gender === item ? 'bg-white/15 text-[#ffd66b]' : 'text-white'}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/90">{gender || 'Not specified'}</p>
          )}
        </div>
      </div>

      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center mb-3">
          <svg className="w-5 h-5 text-[#ffd66b] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-semibold text-white/80">Address</span>
        </div>
        {isEditing ? (
          <div className="space-y-3">
            {[
              { key: 'street1' as const, label: 'Street 1', placeholder: 'e.g. 123 Main St' },
              { key: 'street2' as const, label: 'Street 2', placeholder: 'e.g. Apt 4B' },
              { key: 'aptNumber' as const, label: 'Apt/Suite', placeholder: 'e.g. Suite 500' },
              { key: 'city' as const, label: 'City', placeholder: 'e.g. New York' },
              { key: 'state' as const, label: 'State', placeholder: 'e.g. NY' },
              { key: 'zipCode' as const, label: 'Zip Code', placeholder: 'e.g. 10001', type: 'number' as const },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key} className="flex items-center flex-wrap gap-2">
                <label className={labelClasses}>{label}</label>
                <input
                  type={type || 'text'}
                  className={inputClasses}
                  value={address[key]}
                  onChange={(e) => handleAddressChange(key, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="flex items-center flex-wrap gap-2">
              <label className={labelClasses}>Country</label>
              <button
                onClick={toggleCountryListDropdown}
                className="flex items-center justify-between border border-white/20 rounded-xl px-3 py-3 bg-white/10 min-h-[44px] flex-1 text-left hover:border-[#ffd66b]/50 transition"
              >
                <span className={address.country ? 'text-white' : 'text-white/50'}>
                  {address.country || 'Select Country'}
                </span>
                <svg className="w-5 h-5 text-[#ffd66b] ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {[
              { label: 'Street 1', value: address.street1 },
              { label: 'Street 2', value: address.street2 },
              { label: 'Apt/Suite', value: address.aptNumber },
              { label: 'City', value: address.city },
              { label: 'State', value: address.state },
              { label: 'Country', value: address.country },
              { label: 'Zip Code', value: address.zipCode },
            ]
              .filter((f) => f.value)
              .map((f) => (
                <div key={f.label} className="flex items-start">
                  <span className="w-20 text-sm text-white/60 font-medium mr-2">{f.label}</span>
                  <span className="flex-1 text-sm text-white/90">{f.value}</span>
                </div>
              ))}
            {!address.street1 && !address.street2 && !address.city && !address.country && (
              <p className="italic text-white/50 text-sm">No address provided</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonalDetails
