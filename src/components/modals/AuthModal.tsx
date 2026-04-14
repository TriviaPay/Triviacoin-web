import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDescope } from '@descope/react-sdk'
import { useAppDispatch, useAppSelector } from '../../store/store'
import { closeModal, toggleAuthMode, setAuthMode } from '../../store/uiSlice'
import type { AuthMode } from '../../store/uiSlice'
import Button from '../ui/Button'
import {
  bindPassword,
  loginWithPassword,
  sendOTPVerification,
  verifyOTP,
} from '../../store/authSlice'
import { apiService } from '../../services/apiService'
import CountryPickerModal from '../auth/CountryPickerModal'
import DatePickerModal from '../auth/DatePickerModal'
import PasswordChecklist, { passwordIsValid } from '../auth/PasswordChecklist'
import OtpInput from '../auth/OtpInput'
import ExistingUserPopup from '../auth/ExistingUserPopup'

const fieldClasses =
  'w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm placeholder-white/70 focus:border-[#ffd66b] focus:bg-white/15 outline-none transition-all'

const AUTH_STEPS = {
  EMAIL: 'EMAIL',
  OTP: 'OTP',
  PASSWORD_PROFILE: 'PASSWORD_PROFILE',
  COMPLETED: 'COMPLETED',
} as const
const FORGOT_STEPS = { EMAIL: 'EMAIL', OTP: 'OTP', PASSWORD: 'PASSWORD' } as const

const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase())
const validateUsername = (u: string) =>
  /^[a-zA-Z0-9._]+$/.test(u) && u.length >= 3 && u.length <= 12

const AuthModal = () => {
  const dispatch = useAppDispatch()
  const { modalOpen, authMode } = useAppSelector((s) => s.ui)
  const auth = useAppSelector((s) => s.auth)
  const descope = useDescope()

  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<string | null>(null)
  const [signupStep, setSignupStep] = useState<typeof AUTH_STEPS[keyof typeof AUTH_STEPS]>(AUTH_STEPS.EMAIL)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [sessionDescopeUserId, setSessionDescopeUserId] = useState<string | null>(null)
  const [countryOpen, setCountryOpen] = useState(false)
  const [dobOpen, setDobOpen] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [passwordFieldFocused, setPasswordFieldFocused] = useState(false)
  const [showExistingUserPopup, setShowExistingUserPopup] = useState(false)
  const [existingUserIdentifier, setExistingUserIdentifier] = useState('')
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralChecking, setReferralChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [loginEmailAvailable, setLoginEmailAvailable] = useState<boolean | null>(null)
  const [loginEmailChecking, setLoginEmailChecking] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isSignup = authMode === 'signup'
  const isForgot = authMode === 'forgot'
  const descopeReady = !!descope

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
    if (key === 'username') setUsernameAvailable(null)
    if (key === 'referral') setReferralValid(null)
    if (key === 'email' && !isSignup) setLoginEmailAvailable(null)
  }, [isSignup])

  const [forgotStep, setForgotStep] = useState<typeof FORGOT_STEPS[keyof typeof FORGOT_STEPS]>(FORGOT_STEPS.EMAIL)

  useEffect(() => {
    if (!modalOpen) {
      setSignupStep(AUTH_STEPS.EMAIL)
      setForgotStep(FORGOT_STEPS.EMAIL)
      setSessionToken(null)
      setSessionDescopeUserId(null)
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }, [modalOpen])

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null
    if (resendCountdown > 0) {
      t = setInterval(() => setResendCountdown((c) => Math.max(0, c - 1)), 1000)
    }
    return () => { if (t) clearInterval(t) }
  }, [resendCountdown])

  const canSendOtp = useMemo(() => validateEmail(form.email ?? ''), [form.email])
  const canCompleteSignup = useMemo(
    () =>
      !!form.email &&
      passwordIsValid(form.password || '') &&
      form.password === form.confirm &&
      !!form.country &&
      !!form.dob &&
      !!form.username &&
      validateUsername(form.username),
    [form]
  )
  const canLogin = useMemo(() => !!form.email && !!form.password, [form.email, form.password])

  const handleVerifyEmail = useCallback(async () => {
    if (!canSendOtp) return
    const email = (form.email ?? '').trim().toLowerCase()
    setErrors({})
    setStatus(null)
    setEmailChecking(true)
    try {
      const res = await apiService.checkEmailAvailability(email)
      if (res.success && res.data?.available === false) {
        setExistingUserIdentifier(email)
        setShowExistingUserPopup(true)
        setEmailChecking(false)
        return
      }
      if (res.success === false) {
        setErrors({ email: res.error || 'Could not verify email. Please try again.' })
        setEmailChecking(false)
        return
      }
      if (!descope || !descopeReady) {
        setErrors({ email: 'Auth not ready. Please wait.' })
        setEmailChecking(false)
        return
      }
      const result = await dispatch(
        sendOTPVerification({ email, descope }) as any
      )
      if (sendOTPVerification.fulfilled.match(result)) {
        setStatus('Verification code sent. Check your email.')
        setSignupStep(AUTH_STEPS.OTP)
        setResendCountdown(60)
      } else {
        const err = (result as any).payload || (result as any).error?.message || 'Failed to send OTP'
        const errStr = typeof err === 'string' ? err : ''
        if (errStr.toLowerCase().includes('already exists') || errStr.toLowerCase().includes('user already')) {
          setExistingUserIdentifier(email)
          setShowExistingUserPopup(true)
        } else {
          setErrors({ email: errStr || 'Failed to send verification code' })
        }
      }
    } catch (e: any) {
      setErrors({ email: e?.message || 'Failed to send verification code' })
    } finally {
      setEmailChecking(false)
    }
  }, [canSendOtp, form.email, descope, descopeReady, dispatch])

  const handleOtpComplete = useCallback(
    async (code: string) => {
      const email = (form.email ?? '').trim().toLowerCase()
      if (!email || !descope || !descopeReady) {
        setErrors({ otp: 'Please restart the verification process.' })
        return
      }
      setErrors({})
      setVerifyingOtp(true)
      try {
        const result = await dispatch(verifyOTP({ email, code, descope }) as any)
        if (verifyOTP.fulfilled.match(result)) {
          const p = result.payload as any
          if (p?.token) setSessionToken(p.token)
          if (p?.descope_user_id) setSessionDescopeUserId(p.descope_user_id)
          setSignupStep(AUTH_STEPS.PASSWORD_PROFILE)
          setStatus(null)
        } else {
          const err = (result as any).payload || 'Invalid verification code'
          setErrors({ otp: typeof err === 'string' ? err : 'Invalid verification code' })
        }
      } catch (e: any) {
        setErrors({ otp: e?.message || 'Invalid verification code' })
      } finally {
        setVerifyingOtp(false)
      }
    },
    [form.email, descope, descopeReady, dispatch]
  )

  const handleResendOtp = useCallback(async () => {
    if (resendCountdown > 0) return
    const email = (form.email ?? '').trim().toLowerCase()
    if (!email || !descope || !descopeReady) return
    setErrors({})
    try {
      const result = await dispatch(sendOTPVerification({ email, descope }) as any)
      if (sendOTPVerification.fulfilled.match(result)) {
        setResendCountdown(60)
        setStatus('New code sent. Check your email.')
      } else {
        setErrors({ otp: 'Failed to resend code' })
      }
    } catch {
      setErrors({ otp: 'Failed to resend code' })
    }
  }, [form.email, descope, descopeReady, dispatch, resendCountdown])

  const handleSignup = useCallback(async () => {
    if (!canCompleteSignup || !sessionToken) return
    const email = (form.email ?? '').trim().toLowerCase()
    setStatus(null)
    try {
      await dispatch(
        bindPassword({
          email,
          password: form.password!,
          username: form.username!.trim(),
          country: form.country!,
          date_of_birth: form.dob!,
          referral_code: form.referral?.trim() && referralValid ? form.referral.trim() : null,
          token: sessionToken,
          descope_user_id: sessionDescopeUserId ?? undefined,
        }) as any
      ).unwrap()
      dispatch(closeModal())
    } catch (e: any) {
      setStatus(e?.message || 'Signup failed')
    }
  }, [canCompleteSignup, sessionToken, sessionDescopeUserId, form, referralValid, dispatch])

  const handleLogin = useCallback(async () => {
    if (!canLogin) return
    setStatus(null)
    try {
      await dispatch(
        loginWithPassword({
          identifier: form.email!,
          password: form.password!,
          descope: descope ?? null,
          descopeInstance: descope ?? null,
        }) as any
      ).unwrap()
      dispatch(closeModal())
    } catch (e: any) {
      setStatus(e?.message || 'Invalid email or password')
    }
  }, [canLogin, form.email, form.password, descope, dispatch])

  const handleExistingUserLogin = useCallback(() => {
    setShowExistingUserPopup(false)
    dispatch(setAuthMode('signin'))
  }, [dispatch])

  const handleForgotPassword = useCallback(() => {
    dispatch(setAuthMode('forgot'))
    setForgotStep(FORGOT_STEPS.EMAIL)
    setErrors({})
    setStatus(null)
    setSessionToken(null)
    setSessionDescopeUserId(null)
  }, [dispatch])

  const handleBackToSignIn = useCallback(() => {
    dispatch(setAuthMode('signin'))
    setForgotStep(FORGOT_STEPS.EMAIL)
    setSessionToken(null)
    setSessionDescopeUserId(null)
  }, [dispatch])

  const handleForgotSendOTP = useCallback(async () => {
    const email = (form.email ?? '').trim().toLowerCase()
    if (!validateEmail(email) || !descope || !descopeReady) return
    setErrors({})
    setStatus(null)
    setEmailChecking(true)
    try {
      const res = await apiService.checkEmailAvailability(email)
      if (res.success && res.data?.available === true) {
        setErrors({ email: 'No account found with this email' })
        setEmailChecking(false)
        return
      }
      const result = await dispatch(sendOTPVerification({ email, descope }) as any)
      if (sendOTPVerification.fulfilled.match(result)) {
        setStatus('Reset code sent. Check your email.')
        setForgotStep(FORGOT_STEPS.OTP)
        setResendCountdown(60)
      } else {
        const err = (result as any).payload || 'Failed to send reset code'
        setErrors({ email: typeof err === 'string' ? err : 'Failed to send reset code' })
      }
    } catch (e: any) {
      setErrors({ email: e?.message || 'Failed to send reset code' })
    } finally {
      setEmailChecking(false)
    }
  }, [form.email, descope, descopeReady, dispatch])

  const handleForgotVerifyOTP = useCallback(
    async (code: string) => {
      const email = (form.email ?? '').trim().toLowerCase()
      if (!email || !descope || !descopeReady) return
      setErrors({})
      setVerifyingOtp(true)
      try {
        const result = await dispatch(verifyOTP({ email, code, descope }) as any)
        if (verifyOTP.fulfilled.match(result)) {
          const p = result.payload as any
          if (p?.token) setSessionToken(p.token)
          if (p?.descope_user_id) setSessionDescopeUserId(p.descope_user_id)
          setForgotStep(FORGOT_STEPS.PASSWORD)
          setStatus(null)
        } else {
          const err = (result as any).payload || 'Invalid verification code'
          setErrors({ otp: typeof err === 'string' ? err : 'Invalid verification code' })
        }
      } catch (e: any) {
        setErrors({ otp: e?.message || 'Invalid verification code' })
      } finally {
        setVerifyingOtp(false)
      }
    },
    [form.email, descope, descopeReady, dispatch]
  )

  const handleForgotResetPassword = useCallback(async () => {
    const email = (form.email ?? '').trim().toLowerCase()
    const pwd = form.password ?? ''
    const confirm = form.confirm ?? ''
    if (!email || !sessionToken) return
    if (pwd.length < 8) {
      setErrors({ password: 'Password must be at least 8 characters' })
      return
    }
    if (pwd !== confirm) {
      setErrors({ confirm: 'Passwords do not match' })
      return
    }
    if (!passwordIsValid(pwd)) {
      setErrors({ password: 'Password must meet the requirements' })
      return
    }
    setStatus(null)
    setErrors({})
    try {
      await dispatch(
        bindPassword({
          email,
          password: pwd,
          username: email.split('@')[0],
          country: 'Unknown',
          date_of_birth: '2000-01-01',
          token: sessionToken,
          descope_user_id: sessionDescopeUserId ?? undefined,
        }) as any
      ).unwrap()
      dispatch(closeModal())
    } catch (e: any) {
      setStatus(e?.message || 'Failed to reset password')
    }
  }, [form.email, form.password, form.confirm, sessionToken, sessionDescopeUserId, dispatch])

  useEffect(() => {
    const u = form.username?.trim() ?? ''
    if (!u || u.length < 3 || u.length > 12 || !validateUsername(u)) {
      setUsernameAvailable(null)
      return
    }
    const t = setTimeout(async () => {
      setUsernameChecking(true)
      try {
        const res = await apiService.checkUsernameAvailability(u, sessionToken ?? undefined)
        if (res.success) setUsernameAvailable(res.data?.available ?? null)
        else setUsernameAvailable(null)
      } catch {
        setUsernameAvailable(null)
      } finally {
        setUsernameChecking(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [form.username, sessionToken])

  useEffect(() => {
    const r = form.referral?.trim() ?? ''
    if (!r) {
      setReferralValid(null)
      return
    }
    const t = setTimeout(async () => {
      setReferralChecking(true)
      try {
        const res = await apiService.validateReferralCode(r)
        setReferralValid(res.success && res.data?.valid === true)
      } catch {
        setReferralValid(false)
      } finally {
        setReferralChecking(false)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [form.referral])

  useEffect(() => {
    const e = (form.email ?? '').trim().toLowerCase()
    if (!isSignup && !isForgot && validateEmail(e)) {
      const t = setTimeout(async () => {
        setLoginEmailChecking(true)
        try {
          const res = await apiService.checkEmailAvailability(e)
          if (res.success) setLoginEmailAvailable(res.data?.available ?? null)
          else setLoginEmailAvailable(null)
        } catch {
          setLoginEmailAvailable(null)
        } finally {
          setLoginEmailChecking(false)
        }
      }, 500)
      return () => clearTimeout(t)
    } else {
      setLoginEmailAvailable(null)
    }
  }, [form.email, isSignup, isForgot])

  const handleDateSelect = useCallback((date: string) => {
    updateField('dob', date)
    const d = new Date(date)
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    const m = now.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
    if (age < 13) {
      setErrors((prev) => ({ ...prev, dob: 'Minimum 13 years old required' }))
    }
  }, [updateField])

  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => dispatch(closeModal())}
        >
          <motion.div
            className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1450b1] to-[#0c3c89] p-6 text-white shadow-[0_20px_40px_rgba(0,0,0,0.35)] max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-display">
                {isForgot ? 'Forgot Password' : isSignup ? 'Sign Up' : 'Sign In'}
              </h3>
              <button onClick={() => dispatch(closeModal())} className="text-white/70 hover:text-white">
                ✕
              </button>
            </div>

            {!isForgot && (
              <div className="flex gap-2 rounded-full bg-white/10 p-1 text-sm font-semibold">
                <ToggleChip mode="signin" activeMode={authMode} onClick={() => dispatch(toggleAuthMode())}>
                  Sign In
                </ToggleChip>
                <ToggleChip mode="signup" activeMode={authMode} onClick={() => dispatch(toggleAuthMode())}>
                  Sign Up
                </ToggleChip>
              </div>
            )}
            {isForgot && (
              <button
                type="button"
                onClick={handleBackToSignIn}
                className="mb-2 flex items-center gap-1 text-sm text-white/80 hover:text-white"
              >
                ← Back to Sign In
              </button>
            )}

            <div className="mt-4 space-y-4">
              {isForgot ? (
                <>
                  {forgotStep === FORGOT_STEPS.EMAIL && (
                    <>
                      <Field
                        label="Email"
                        type="email"
                        value={form.email ?? ''}
                        error={errors.email}
                        onChange={(v) => updateField('email', v)}
                      />
                      <Button
                        className="w-full py-3 text-base"
                        disabled={!validateEmail(form.email ?? '') || emailChecking || auth.isLoading || !descopeReady}
                        onClick={handleForgotSendOTP}
                      >
                        {emailChecking ? 'Checking…' : auth.isLoading ? 'Sending…' : 'Send Reset Code'}
                      </Button>
                    </>
                  )}
                  {forgotStep === FORGOT_STEPS.OTP && (
                    <>
                      <p className="text-sm text-white/90">Enter the 6-digit code sent to {form.email}</p>
                      {verifyingOtp && <p className="text-center text-sm text-amber-200">Verifying…</p>}
                      <OtpInput
                        length={6}
                        onComplete={handleForgotVerifyOTP}
                        onResend={handleResendOtp}
                        error={errors.otp}
                        disabled={auth.isLoading || verifyingOtp}
                        resendCountdown={resendCountdown}
                        email={form.email}
                      />
                    </>
                  )}
                  {forgotStep === FORGOT_STEPS.PASSWORD && (
                    <>
                      <PasswordField
                        label="New Password"
                        value={form.password ?? ''}
                        error={errors.password}
                        onChange={(v) => updateField('password', v)}
                        onFocus={() => setPasswordFieldFocused(true)}
                        onBlur={() => setPasswordFieldFocused(false)}
                        showPassword={showPassword}
                        onToggleShowPassword={() => setShowPassword((p) => !p)}
                      />
                      <PasswordField
                        label="Confirm New Password"
                        value={form.confirm ?? ''}
                        error={errors.confirm}
                        onChange={(v) => updateField('confirm', v)}
                        showPassword={showConfirmPassword}
                        onToggleShowPassword={() => setShowConfirmPassword((p) => !p)}
                      />
                      <PasswordChecklist value={form.password ?? ''} visible={passwordFieldFocused} />
                      {auth.isLoading && <p className="text-center text-sm text-amber-200">Updating password…</p>}
                      <Button
                        className="w-full py-3 text-base"
                        disabled={
                          !passwordIsValid(form.password ?? '') ||
                          form.password !== form.confirm ||
                          auth.isLoading
                        }
                        onClick={handleForgotResetPassword}
                      >
                        {auth.isLoading ? 'Updating…' : 'Reset Password'}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
              <Field
                label="Email"
                type="email"
                value={form.email ?? ''}
                error={errors.email}
                onChange={(v) => updateField('email', v)}
                disabled={isSignup && signupStep !== AUTH_STEPS.EMAIL}
              />
              {!isSignup && validateEmail(form.email ?? '') && (
                <div className="text-xs text-white/80">
                  {loginEmailChecking ? 'Checking…' : loginEmailAvailable === false ? '✓ Account exists – you can login' : loginEmailAvailable === true ? '✗ Account not found – please sign up' : ''}
                </div>
              )}
              {isSignup && signupStep === AUTH_STEPS.EMAIL && (
                <Button
                  className="w-full py-3 text-base"
                  disabled={!canSendOtp || emailChecking || auth.isLoading || !descopeReady}
                  onClick={handleVerifyEmail}
                >
                  {emailChecking ? 'Checking email…' : auth.isLoading ? 'Sending code…' : 'Verify Email'}
                </Button>
              )}

              {isSignup && signupStep === AUTH_STEPS.OTP && (
                <>
                  {verifyingOtp && (
                    <p className="text-center text-sm text-amber-200">Verifying code…</p>
                  )}
                  <OtpInput
                    length={6}
                    onComplete={handleOtpComplete}
                    onResend={handleResendOtp}
                    error={errors.otp}
                    disabled={auth.isLoading || verifyingOtp}
                    resendCountdown={resendCountdown}
                    email={form.email}
                  />
                </>
              )}

              {isSignup && signupStep === AUTH_STEPS.PASSWORD_PROFILE && (
                <>
                  <PasswordField
                    label="Password"
                    value={form.password ?? ''}
                    error={errors.password}
                    onChange={(v) => updateField('password', v)}
                    onFocus={() => setPasswordFieldFocused(true)}
                    onBlur={() => setPasswordFieldFocused(false)}
                    showPassword={showPassword}
                    onToggleShowPassword={() => setShowPassword((p) => !p)}
                  />
                  <PasswordField
                    label="Confirm Password"
                    value={form.confirm ?? ''}
                    error={errors.confirm}
                    onChange={(v) => updateField('confirm', v)}
                    showPassword={showConfirmPassword}
                    onToggleShowPassword={() => setShowConfirmPassword((p) => !p)}
                  />
                  <PasswordChecklist value={form.password ?? ''} visible={passwordFieldFocused} />

                  <Field
                    label="Username"
                    value={form.username ?? ''}
                    error={errors.username}
                    onChange={(v) => updateField('username', v)}
                  />
                  {form.username && validateUsername(form.username) && (
                    <div className="text-xs text-white/80">
                      {usernameChecking ? 'Checking…' : usernameAvailable === true ? '✓ Username available' : usernameAvailable === false ? '✗ Username taken' : ''}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`${fieldClasses} text-left`}
                      onClick={() => setCountryOpen(true)}
                    >
                      <div className="text-white/60 text-xs">Country</div>
                      <div className="text-white font-semibold">{form.country || 'Select country'}</div>
                    </button>
                    <button
                      type="button"
                      className={`${fieldClasses} text-left`}
                      onClick={() => setDobOpen(true)}
                    >
                      <div className="text-white/60 text-xs">Date of Birth</div>
                      <div className="text-white font-semibold">{form.dob || 'Select date'}</div>
                    </button>
                  </div>
                  {errors.country && <p className="text-xs text-[#fbb6c2]">{errors.country}</p>}
                  {errors.dob && <p className="text-xs text-[#fbb6c2]">{errors.dob}</p>}

                  <Field
                    label="Referral Code (Optional)"
                    value={form.referral ?? ''}
                    onChange={(v) => updateField('referral', v)}
                  />
                  {form.referral && (
                    <div className="text-xs text-white/80">
                      {referralChecking ? 'Checking…' : referralValid ? '✓ Valid' : referralValid === false ? '✗ Invalid' : ''}
                    </div>
                  )}
                </>
              )}

              {!isSignup && (
                <>
                  <PasswordField
                    label="Password"
                    value={form.password ?? ''}
                    error={errors.password}
                    onChange={(v) => updateField('password', v)}
                    showPassword={showPassword}
                    onToggleShowPassword={() => setShowPassword((p) => !p)}
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-white/80 hover:text-white underline"
                  >
                    Forgot Password?
                  </button>
                </>
              )}
                </>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {isSignup && signupStep === AUTH_STEPS.PASSWORD_PROFILE && (
                <>
                  {auth.isLoading && (
                    <p className="text-center text-sm text-amber-200">Creating your account…</p>
                  )}
                  <Button
                    className="w-full py-3 text-base"
                    disabled={!canCompleteSignup || auth.isLoading || usernameAvailable === false}
                    onClick={handleSignup}
                  >
                    {auth.isLoading ? 'Creating…' : 'Create Account'}
                  </Button>
                </>
              )}

              {!isSignup && !isForgot && (
                <>
                  {auth.isLoading && (
                    <p className="text-center text-sm text-amber-200">Signing you in…</p>
                  )}
                  <Button
                    className="w-full py-3 text-base"
                    disabled={!canLogin || auth.isLoading}
                    onClick={handleLogin}
                  >
                    {auth.isLoading ? 'Signing in…' : 'Sign In'}
                  </Button>
                </>
              )}

              {status ? <p className="text-xs text-amber-200">{status}</p> : null}
            </div>

            <CountryPickerModal
              open={countryOpen}
              onClose={() => setCountryOpen(false)}
              onSelect={(c) => updateField('country', c)}
              selected={form.country}
            />
            <DatePickerModal
              open={dobOpen}
              onClose={() => setDobOpen(false)}
              value={form.dob}
              onSelect={handleDateSelect}
            />
            <ExistingUserPopup
              visible={showExistingUserPopup}
              onClose={() => setShowExistingUserPopup(false)}
              onLogin={handleExistingUserLogin}
              onForgotPassword={handleForgotPassword}
              identifier={existingUserIdentifier}
              identifierType="email"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const ToggleChip = ({
  mode,
  activeMode,
  onClick,
  children,
}: {
  mode: AuthMode
  activeMode: AuthMode
  onClick: () => void
  children: string
}) => {
  const active = mode === activeMode
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`flex-1 rounded-full px-3 py-2 text-center transition-all ${
        active ? 'bg-gradient-to-b from-[#ffd66b] to-[#f3a011] text-[#7c4c00]' : 'text-white/80'
      }`}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}

const Field = ({
  label,
  type = 'text',
  placeholder,
  value,
  error,
  optional,
  disabled,
  onChange,
  onFocus,
  onBlur,
}: {
  label: string
  type?: string
  placeholder?: string
  value: string
  error?: string
  optional?: boolean
  disabled?: boolean
  onChange: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
}) => (
  <div className="space-y-1">
    <label className="text-sm text-white/80">
      {label} {optional ? <span className="text-white/40">(optional)</span> : null}
    </label>
    <input
      className={`${fieldClasses} ${error ? 'border-[#f55b6a] bg-[#f55b6a]/10' : ''}`}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
    />
    {error ? <p className="text-xs text-[#fbb6c2]">{error}</p> : null}
  </div>
)

const PasswordField = ({
  label,
  value,
  error,
  onChange,
  onFocus,
  onBlur,
  showPassword,
  onToggleShowPassword,
}: {
  label: string
  value: string
  error?: string
  onChange: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
  showPassword: boolean
  onToggleShowPassword: () => void
}) => (
  <div className="space-y-1">
    <label className="text-sm text-white/80">{label}</label>
    <div className="relative">
      <input
        className={`${fieldClasses} pr-12 ${error ? 'border-[#f55b6a] bg-[#f55b6a]/10' : ''}`}
        type={showPassword ? 'text' : 'password'}
        value={value}
        placeholder="••••••••"
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        onClick={onToggleShowPassword}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-1 rounded"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
    {error ? <p className="text-xs text-[#fbb6c2]">{error}</p> : null}
  </div>
)

export default AuthModal
