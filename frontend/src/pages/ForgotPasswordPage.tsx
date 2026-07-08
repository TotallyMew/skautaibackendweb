import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, MailQuestion } from "lucide-react";
import { ApiError, api } from "../api/client";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await api.forgotPassword({ email: email.trim().toLowerCase() });
      setMessage(response.message);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Prašymo pateikti nepavyko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-form-page">
      <form className="form-panel auth-form-panel" onSubmit={submit}>
        <AuthBackLink />
        <section className="form-section">
          <div className="form-section-heading">
            <MailQuestion size={20} aria-hidden="true" />
            <div>
              <h2>Slaptažodžio atkūrimas</h2>
              <span>Įveskite paskyros el. paštą. Jei paskyra egzistuoja, atsiųsime atkūrimo nuorodą.</span>
            </div>
          </div>

          <label className="form-field">
            <span>El. paštas</span>
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {message && <p className="success-text">{message}</p>}
          {error && <p className="error-text">{error}</p>}

          <button className="primary-button compact-primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Siunčiama..." : "Siųsti atkūrimo nuorodą"}
          </button>
        </section>
      </form>
    </main>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("Atkūrimo nuorodoje trūksta saugos rakto.");
      return;
    }
    if (password.length < 8) {
      setError("Slaptažodis turi būti bent 8 simbolių.");
      return;
    }
    if (password !== repeatPassword) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.resetPassword({ token, newPassword: password });
      setMessage(response.message);
      setPassword("");
      setRepeatPassword("");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Slaptažodžio pakeisti nepavyko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-form-page">
      <form className="form-panel auth-form-panel" onSubmit={submit}>
        <AuthBackLink />
        <section className="form-section">
          <div className="form-section-heading">
            <KeyRound size={20} aria-hidden="true" />
            <div>
              <h2>Naujas slaptažodis</h2>
              <span>Sukurkite naują slaptažodį šiai paskyrai.</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>Naujas slaptažodis</span>
              <input
                autoComplete="new-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Pakartokite slaptažodį</span>
              <input
                autoComplete="new-password"
                required
                type="password"
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
              />
            </label>
          </div>

          {message && (
            <p className="success-text">
              {message} <Link to="/login">Grįžti į prisijungimą</Link>
            </p>
          )}
          {error && <p className="error-text">{error}</p>}

          <button className="primary-button compact-primary-button" type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? "Keičiama..." : "Pakeisti slaptažodį"}
          </button>
        </section>
      </form>
    </main>
  );
}

function AuthBackLink() {
  return (
    <Link className="back-link" to="/login">
      <ArrowLeft size={17} aria-hidden="true" />
      Atgal į prisijungimą
    </Link>
  );
}
