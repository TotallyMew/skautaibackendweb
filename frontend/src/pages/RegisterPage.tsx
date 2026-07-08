import { FormEvent, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, type LucideIcon } from "lucide-react";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const krastai = ["Alytaus", "Kauno", "Klaipėdos", "Marijampolės", "Šiaulių", "Tauragės", "Telšių", "Utenos", "Vilniaus"];

export function RegisterPage() {
  const { registerTuntas } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    phone: "",
    tuntasName: "",
    tuntasKrastas: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await registerTuntas({
        ...form,
        email: form.email.trim().toLowerCase(),
        phone: optional(form.phone),
        tuntasContactEmail: form.email.trim().toLowerCase()
      });
      navigate("/tuntas", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Registracija nepavyko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormPage
      title="Registracija - tuntininkas"
      subtitle="Sukurk paskyrą ir užregistruok tuntą patvirtinimui."
      icon={Building2}
      onSubmit={submit}
      error={error}
      submitText={isSubmitting ? "Registruojama..." : "Registruotis"}
      disabled={isSubmitting}
    >
      <div className="form-section-heading compact-auth-heading">
        <Building2 size={20} aria-hidden="true" />
        <div>
          <h3>Asmeninė informacija</h3>
          <span>Šie duomenys bus naudojami tuntininko paskyrai.</span>
        </div>
      </div>
      <AuthGrid>
        <TextField label="Vardas *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
        <TextField label="Pavardė *" value={form.surname} onChange={(value) => setForm((current) => ({ ...current, surname: value }))} required />
        <TextField label="El. paštas *" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
        <TextField label="Slaptažodis *" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} required />
        <TextField label="Telefono numeris" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
      </AuthGrid>

      <div className="form-section-heading compact-auth-heading">
        <Building2 size={20} aria-hidden="true" />
        <div>
          <h3>Tunto informacija</h3>
          <span>Po registracijos tuntas lauks superadministratoriaus patvirtinimo.</span>
        </div>
      </div>
      <AuthGrid>
        <TextField label="Tunto pavadinimas *" value={form.tuntasName} onChange={(value) => setForm((current) => ({ ...current, tuntasName: value }))} required />
        <label className="form-field">
          <span>Kraštas *</span>
          <select value={form.tuntasKrastas} onChange={(event) => setForm((current) => ({ ...current, tuntasKrastas: event.target.value }))} required>
            <option value="">Pasirinkite kraštą</option>
            {krastai.map((krastas) => (
              <option key={krastas} value={krastas}>{krastas}</option>
            ))}
          </select>
        </label>
      </AuthGrid>
    </AuthFormPage>
  );
}

export function RegisterInvitePage() {
  const { registerInvite } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    surname: "",
    email: "",
    password: "",
    phone: "",
    inviteCode: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const state = await registerInvite({
        ...form,
        email: form.email.trim().toLowerCase(),
        phone: optional(form.phone),
        inviteCode: form.inviteCode.trim()
      });
      navigate(state.activeTuntasId ? "/" : "/tuntas", { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Registracija nepavyko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormPage
      title="Registracija su pakvietimu"
      subtitle="Susikurk paskyrą naudodamas tunto arba vieneto pakvietimo kodą."
      icon={Building2}
      onSubmit={submit}
      error={error}
      submitText={isSubmitting ? "Registruojama..." : "Registruotis"}
      disabled={isSubmitting}
    >
      <AuthGrid>
        <TextField label="Vardas *" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
        <TextField label="Pavardė *" value={form.surname} onChange={(value) => setForm((current) => ({ ...current, surname: value }))} required />
        <TextField label="El. paštas *" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} required />
        <TextField label="Slaptažodis *" type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} required />
        <TextField label="Telefono numeris" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
        <TextField label="Pakvietimo kodas *" value={form.inviteCode} onChange={(value) => setForm((current) => ({ ...current, inviteCode: value }))} required />
      </AuthGrid>
    </AuthFormPage>
  );
}

function AuthFormPage({
  title,
  subtitle,
  icon: Icon,
  onSubmit,
  error,
  submitText,
  disabled,
  children
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string | null;
  submitText: string;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <main className="auth-form-page">
      <form className="form-panel auth-form-panel" onSubmit={onSubmit}>
        <Link className="back-link" to="/login">
          <ArrowLeft size={17} aria-hidden="true" />
          Atgal į prisijungimą
        </Link>
        <section className="form-section">
          <div className="form-section-heading">
            <Icon size={20} aria-hidden="true" />
            <div>
              <h2>{title}</h2>
              <span>{subtitle}</span>
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          {children}
          <p className="auth-required-note">* Privalomi laukai</p>
          <button className="primary-button compact-primary-button" type="submit" disabled={disabled}>
            {submitText}
          </button>
        </section>
      </form>
    </main>
  );
}

function AuthGrid({ children }: { children: ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
