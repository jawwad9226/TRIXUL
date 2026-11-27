"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { apiGet, apiPost } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState("phone")
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (step !== "code" || secondsLeft <= 0) return undefined
    const timer = window.setTimeout(() => setSecondsLeft((remaining) => remaining - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft, step])

  async function sendCode(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const { csrf_token: csrfToken } = await apiGet("/api/v1/public/auth/csrf/")
      const result = await apiPost(
        "/api/v1/public/auth/otp/request/",
        { phone_number: phoneNumber.trim() },
        csrfToken,
      )
      setStep("code")
      setCode("")
      setSecondsLeft(result.expires_in)
      setMessage(
        result.delivery_mode === "console"
          ? "Your one-minute code was printed to the backend terminal."
          : "Enter the one-time code to continue.",
      )
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const { csrf_token: csrfToken } = await apiGet("/api/v1/public/auth/csrf/")
      await apiPost(
        "/api/v1/public/auth/otp/verify/",
        { phone_number: phoneNumber.trim(), code },
        csrfToken,
      )
      router.replace("/dashboard")
      router.refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">s</span><span>Swaym Yatri</span>
        </Link>
        <Link className="quiet-link" href="/dashboard">Explore as guest</Link>
      </header>

      <section className="login-layout">
        <div className="login-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> YOUR CITY, CONNECTED</span>
          <h1>Sign in with<br /><em>your phone.</em></h1>
          <p>Verify your number with a one-time code. You can still explore public bus information as a guest.</p>
        </div>

        <section className="login-card" aria-labelledby="login-title">
          <span className="login-card-icon" aria-hidden="true">✦</span>
          <h2 id="login-title">{step === "phone" ? "Enter your phone number" : "Enter your code"}</h2>
          <p className="login-card-intro">
            {step === "phone"
              ? "Use international format, including the + and country code."
              : `Code sent for ${phoneNumber}. It expires in ${secondsLeft}s.`}
          </p>

          {step === "phone" ? (
            <form className="login-form" onSubmit={sendCode}>
              <label htmlFor="phone-number">Phone number</label>
              <input
                autoComplete="tel"
                autoFocus
                id="phone-number"
                maxLength={16}
                onChange={(event) => setPhoneNumber(event.target.value)}
                pattern="\\+[1-9][0-9]{7,14}"
                placeholder="+919876543210"
                required
                type="tel"
                value={phoneNumber}
              />
              <button className="button button-primary login-submit" disabled={busy} type="submit">
                {busy ? "Sending code…" : "Send one-time code"} <span aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={verifyCode}>
              <label htmlFor="otp-code">6-digit code</label>
              <input
                autoComplete="one-time-code"
                autoFocus
                disabled={secondsLeft === 0}
                id="otp-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                pattern="[0-9]{6}"
                placeholder="000000"
                required
                type="text"
                value={code}
              />
              <button className="button button-primary login-submit" disabled={busy || secondsLeft === 0} type="submit">
                {busy ? "Verifying…" : "Verify and continue"} <span aria-hidden="true">→</span>
              </button>
              <button
                className="login-text-button"
                disabled={busy || secondsLeft > 0}
                onClick={sendCode}
                type="button"
              >
                {secondsLeft > 0 ? `Request another code in ${secondsLeft}s` : "Send a new code"}
              </button>
              <button
                className="login-text-button"
                disabled={busy}
                onClick={() => {
                  setStep("phone")
                  setCode("")
                  setSecondsLeft(0)
                  setMessage("")
                  setError("")
                }}
                type="button"
              >
                Change phone number
              </button>
            </form>
          )}

          {message && <p className="login-message" role="status">{message}</p>}
          {error && <p className="login-error" role="alert">{error}</p>}
          <p className="login-dev-note">Development sign-in only. Codes appear in the backend terminal; no SMS is sent.</p>
        </section>
      </section>
    </main>
  )
}
