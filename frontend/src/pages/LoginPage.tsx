import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import type { AuthState } from "../auth/authStorage";

export function LoginPage() {
  const { auth, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  if (isAuthenticated) {
    return <Navigate to={auth ? destinationForAuth(auth, from) : from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const state = await login({ email: email.trim().toLowerCase(), password });
      navigate(destinationForAuth(state, from), { replace: true });
    } catch {
      setError("Nepavyko prisijungti. Patikrink el. paštą ir slaptažodį.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="auth-stack">
        <section className="auth-hero">
          <span>Skautų inventorius</span>
          <h1>Prisijunk prie savo tunto inventoriaus</h1>
          <p>Vienoje vietoje matysi bendrą tunto, vieneto ir savo siūlomą inventorių.</p>
        </section>

        <section className="login-panel">
          <div className="brand login-brand">
            <span className="brand-mark">SI</span>
            <div>
              <strong>Prisijungimas</strong>
              <small>Žiniatinklio sistema</small>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              El. paštas
              <input
                autoComplete="email"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              Slaptažodis
              <input
                autoComplete="current-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <Link className="auth-subtle-link" to="/forgot-password">Pamiršote slaptažodį?</Link>

            {error && <p className="error-text">{error}</p>}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <LogIn size={18} aria-hidden="true" />
              {isSubmitting ? "Jungiama..." : "Prisijungti"}
            </button>
          </form>

          <div className="auth-link-stack">
            <InlineAuthLink prompt="Turite pakvietimą?" action="Susikurkite paskyrą" to="/register/invite" />
            <InlineAuthLink prompt="Tunto dar nėra?" action="Užregistruokite jį" to="/register" />
          </div>
        </section>
      </div>
    </main>
  );
}

function InlineAuthLink({ prompt, action, to }: { prompt: string; action: string; to: string }) {
  return (
    <p>
      <span>{prompt}</span>
      <Link to={to}>{action}</Link>
    </p>
  );
}

function destinationForAuth(state: AuthState, fallback: string) {
  if (state.type === "super_admin") return "/admin";
  if (state.activeTuntasId) return fallback;
  return "/tuntas";
}
