import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"user" | "super_admin">("user");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password }, loginMode);
      navigate(loginMode === "super_admin" ? "/admin" : from, { replace: true });
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
            <div className="segmented-tabs auth-mode-tabs" aria-label="Prisijungimo tipas">
              <button
                className={`segmented-tab${loginMode === "user" ? " active" : ""}`}
                type="button"
                onClick={() => setLoginMode("user")}
              >
                Tunto vartotojas
              </button>
              <button
                className={`segmented-tab${loginMode === "super_admin" ? " active" : ""}`}
                type="button"
                onClick={() => setLoginMode("super_admin")}
              >
                Superadmin
              </button>
            </div>

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

            {error && <p className="error-text">{error}</p>}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <LogIn size={18} aria-hidden="true" />
              {isSubmitting ? "Jungiama..." : "Prisijungti"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
