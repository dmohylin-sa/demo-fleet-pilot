import { useState } from 'react'
import './demo-login.css'

/**
 * A demo gate, not security. The password ships in the client bundle by design: this app
 * exists to show the screens to a prospect, and the sign-in is part of that story rather
 * than real access control. Any well-formed email is accepted with the demo password.
 *
 * Added by the local-deploy-presale-demo skill. To remove it, delete this folder and the
 * <DemoLoginGate> wrapper in the entry file.
 */
const DEMO_PASSWORD = 'geniusee'
const STORAGE_KEY = 'demo-fleet-pilot.demo-session'
const APP_TITLE = 'TrafixCT Pilot Demo'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/* Renders the app once signed in. The session lives in sessionStorage, so closing the tab
   signs out and the app itself needs no sign-out control. */
export function DemoLoginGate({ children }) {
  const [session, setSession] = useState(readSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  if (session) return <>{children}</>

  const submit = (event) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Enter your email address to continue.')
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('That is not an email address. Use the form name@example.com.')
      return
    }
    if (password !== DEMO_PASSWORD) {
      setError('That password is not the demo password.')
      return
    }
    const next = { email: trimmed }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // An unavailable sessionStorage costs the reload, not the sign-in.
    }
    setSession(next)
  }

  return (
    <div className="demo-login">
      <form className="demo-login-card" onSubmit={submit} noValidate>
        <div className="demo-login-head">
          <h1 className="demo-login-title">{APP_TITLE}</h1>
          <p className="demo-login-sub">Sign in to open the demo.</p>
        </div>

        <label className="demo-login-field" htmlFor="demo-login-email">
          <span>Email</span>
          <input
            id="demo-login-email"
            type="email"
            autoComplete="username"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            aria-invalid={error ? true : undefined}
            autoFocus
          />
        </label>

        <label className="demo-login-field" htmlFor="demo-login-password">
          <span>Password</span>
          <input
            id="demo-login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Demo password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            aria-invalid={error ? true : undefined}
          />
        </label>

        {error && (
          <div className="demo-login-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="demo-login-button">
          Sign in
        </button>

        <p className="demo-login-note">Demo environment - sample data only.</p>
      </form>
    </div>
  )
}
