import React, { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useDescope } from '@descope/react-sdk'
import { sendOTPVerification, verifyOTP, bindPassword, loginWithPassword } from '../../store/authSlice'
import CountryPickerModal from './CountryPickerModal'
import DatePickerModal from './DatePickerModal'
import PasswordChecklist, { passwordIsValid } from './PasswordChecklist'
import { AUTH_STEPS } from '../../config/descope'

const initialSignup = {
  email: '',
  otp: '',
  username: '',
  password: '',
  confirm: '',
  country: '',
  dob: '',
  referral: '',
}

const AuthFlow: React.FC = () => {
  const dispatch = useDispatch()
  const descope = useDescope()
  const auth = useSelector((s: any) => s.auth)
  const [step, setStep] = useState<string>(AUTH_STEPS.EMAIL_VERIFICATION)
  const [form, setForm] = useState(initialSignup)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionDescopeUserId, setSessionDescopeUserId] = useState<string | null>(null)
  const [countryOpen, setCountryOpen] = useState(false)
  const [dobOpen, setDobOpen] = useState(false)

  const update = (key: keyof typeof form, val: string) => setForm((p) => ({ ...p, [key]: val }))

  const handleSendOtp = useCallback(async () => {
    await dispatch(sendOTPVerification({ email: form.email, descope }) as any)
    setStep(AUTH_STEPS.OTP_VERIFICATION)
  }, [dispatch, form.email, descope])

  const handleVerifyOtp = useCallback(async () => {
    const result = await dispatch(verifyOTP({ email: form.email, code: form.otp, descope }) as any)
    if (verifyOTP.fulfilled.match(result) && result.payload?.token) {
      setSessionToken(result.payload.token)
      if ((result.payload as any)?.descope_user_id) setSessionDescopeUserId((result.payload as any).descope_user_id)
      setStep(AUTH_STEPS.PASSWORD_SETUP)
    }
  }, [dispatch, form.email, form.otp, descope])

  const handleBindPassword = useCallback(async () => {
    if (!sessionToken) return
    await dispatch(
      bindPassword({
        email: form.email,
        password: form.password,
        username: form.username,
        country: form.country,
        date_of_birth: form.dob,
        referral_code: form.referral || null,
        token: sessionToken,
        descope_user_id: sessionDescopeUserId ?? undefined,
      }) as any
    )
    setStep(AUTH_STEPS.COMPLETED)
  }, [dispatch, form, sessionToken, sessionDescopeUserId])

  const handleLogin = useCallback(async () => {
    await dispatch(
      loginWithPassword({
        identifier: form.email,
        password: form.password,
        descope,
        descopeInstance: descope,
      }) as any
    )
  }, [dispatch, form.email, form.password, descope])

  const canSubmitPassword = useMemo(
    () =>
      passwordIsValid(form.password) &&
      form.password === form.confirm &&
      form.username.trim().length > 0 &&
      !!form.country &&
      !!form.dob,
    [form]
  )

  const isSignup = step !== 'login'

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 rounded-2xl bg-[#0f1e3a] p-6 text-white shadow-2xl">
      <h1 className="text-2xl font-bold">{isSignup ? 'Sign Up' : 'Login'}</h1>

      {step === AUTH_STEPS.EMAIL_VERIFICATION && (
        <div className="space-y-4">
          <label className="space-y-2 text-sm">
            <span>Email</span>
            <input
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button
            className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-[#0f1e3a] disabled:opacity-60"
            disabled={!form.email || auth.isLoading}
            onClick={handleSendOtp}
          >
            {auth.isLoading ? 'Sending…' : 'Send OTP'}
          </button>
        </div>
      )}

      {step === AUTH_STEPS.OTP_VERIFICATION && (
        <div className="space-y-4">
          <label className="space-y-2 text-sm">
            <span>Enter OTP</span>
            <input
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.otp}
              onChange={(e) => update('otp', e.target.value)}
              placeholder="123456"
            />
          </label>
          <button
            className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-[#0f1e3a] disabled:opacity-60"
            disabled={!form.otp || auth.isLoading}
            onClick={handleVerifyOtp}
          >
            {auth.isLoading ? 'Verifying…' : 'Verify OTP'}
          </button>
        </div>
      )}

      {step === AUTH_STEPS.PASSWORD_SETUP && (
        <div className="space-y-4">
          <label className="space-y-2 text-sm">
            <span>Username</span>
            <input
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="Username"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Password</span>
            <input
              type="password"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="********"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Confirm Password</span>
            <input
              type="password"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.confirm}
              onChange={(e) => update('confirm', e.target.value)}
              placeholder="********"
            />
          </label>

          <PasswordChecklist value={form.password} />

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm"
              onClick={() => setCountryOpen(true)}
            >
              <div className="text-white/70 text-xs">Country</div>
              <div className="text-white font-semibold">{form.country || 'Select country'}</div>
            </button>

            <button
              type="button"
              className="rounded-xl bg-white/10 px-4 py-3 text-left text-sm"
              onClick={() => setDobOpen(true)}
            >
              <div className="text-white/70 text-xs">Date of Birth</div>
              <div className="text-white font-semibold">{form.dob || 'Select date'}</div>
            </button>
          </div>

          <label className="space-y-2 text-sm">
            <span>Referral Code (Optional)</span>
            <input
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.referral}
              onChange={(e) => update('referral', e.target.value)}
              placeholder="Referral Code (Optional)"
            />
          </label>

          <button
            className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-[#0f1e3a] disabled:opacity-60"
            disabled={!sessionToken || !canSubmitPassword || auth.isLoading}
            onClick={handleBindPassword}
          >
            {auth.isLoading ? 'Completing…' : 'Complete Signup'}
          </button>
        </div>
      )}

      {step === 'login' && (
        <div className="space-y-4">
          <label className="space-y-2 text-sm">
            <span>Email</span>
            <input
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Password</span>
            <input
              type="password"
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="********"
            />
          </label>
          <button
            className="w-full rounded-xl bg-yellow-400 py-3 font-semibold text-[#0f1e3a] disabled:opacity-60"
            disabled={!form.email || !form.password || auth.isLoading}
            onClick={handleLogin}
          >
            {auth.isLoading ? 'Logging in…' : 'Login'}
          </button>
        </div>
      )}

      <div className="text-sm text-white/70">
        {step === 'login' ? (
          <button className="underline" onClick={() => setStep(AUTH_STEPS.EMAIL_VERIFICATION)}>
            Create account
          </button>
        ) : (
          <button className="underline" onClick={() => setStep('login')}>
            Already have an account? Login
          </button>
        )}
      </div>

      <CountryPickerModal
        open={countryOpen}
        onClose={() => setCountryOpen(false)}
        onSelect={(c) => update('country', c)}
        selected={form.country}
      />
      <DatePickerModal
        open={dobOpen}
        onClose={() => setDobOpen(false)}
        value={form.dob}
        onSelect={(d) => update('dob', d)}
      />
    </div>
  )
}

export default AuthFlow

