import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, KeyRound, Loader2, RefreshCw, Save, ShieldAlert, UserRound } from "lucide-react";
import { ApiError, api } from "../api/client";
import type { MyProfile } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiPageShell } from "../components/ui/Skautai";

export function ProfilePage() {
  const { auth, logout, updateProfileSnapshot } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", surname: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", repeatPassword: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isRequestingDeletion, setIsRequestingDeletion] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.token) return;
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .myProfile(auth.token)
      .then((response) => {
        if (isCancelled) return;
        setProfile(response);
        setProfileForm({
          name: response.name,
          surname: response.surname,
          email: response.email,
          phone: response.phone ?? ""
        });
      })
      .catch((cause) => {
        if (!isCancelled) {
          setError(cause instanceof Error ? cause.message : "Profilio užkrauti nepavyko.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [auth?.token, reloadKey]);

  const initials = useMemo(() => {
    const letters = [profileForm.name, profileForm.surname]
      .map((value) => value.trim()[0])
      .filter(Boolean)
      .join("");
    return letters.slice(0, 2).toUpperCase() || "SI";
  }, [profileForm.name, profileForm.surname]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token) return;
    setError(null);
    setMessage(null);

    if (!profileForm.name.trim()) return setError("Įveskite vardą.");
    if (!profileForm.surname.trim()) return setError("Įveskite pavardę.");
    if (!profileForm.email.trim()) return setError("Įveskite el. paštą.");

    setIsSavingProfile(true);
    try {
      const response = await api.updateMyProfile(auth.token, {
        name: profileForm.name.trim(),
        surname: profileForm.surname.trim(),
        email: profileForm.email.trim().toLowerCase(),
        phone: optional(profileForm.phone)
      });
      setProfile(response);
      setProfileForm({
        name: response.name,
        surname: response.surname,
        email: response.email,
        phone: response.phone ?? ""
      });
      updateProfileSnapshot(response);
      setMessage("Profilis atnaujintas.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Profilio atnaujinti nepavyko.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token) return;
    setError(null);
    setMessage(null);

    if (!passwordForm.currentPassword) return setError("Įveskite dabartinį slaptažodį.");
    if (passwordForm.newPassword.length < 8) return setError("Naujas slaptažodis turi būti bent 8 simbolių.");
    if (passwordForm.newPassword !== passwordForm.repeatPassword) return setError("Slaptažodžiai nesutampa.");

    setIsSavingPassword(true);
    try {
      await api.changeMyPassword(auth.token, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", repeatPassword: "" });
      setMessage("Slaptažodis pakeistas. Prisijunk iš naujo.");
      await logout();
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Slaptažodžio pakeisti nepavyko.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token) return;
    setError(null);
    setMessage(null);

    if (!deletePassword) return setError("Įveskite slaptažodį paskyros ištrynimo prašymui.");

    setIsRequestingDeletion(true);
    try {
      await api.requestAccountDeletion(auth.token, { password: deletePassword });
      setDeletePassword("");
      setMessage("Patvirtinimo nuoroda išsiųsta į jūsų el. paštą.");
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error ? cause.message : "Prašymo pateikti nepavyko.");
    } finally {
      setIsRequestingDeletion(false);
    }
  }

  const actions = (
    <button className="secondary-button" type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={isLoading}>
      <RefreshCw size={16} aria-hidden="true" />
      Atnaujinti
    </button>
  );

  return (
    <SkautaiPageShell
      className="profile-page"
      eyebrow="Paskyra"
      title="Mano profilis"
      description="Asmeniniai duomenys, prisijungimo sauga ir paskyros valdymas."
      actions={actions}
      width="standard"
    >

      {message && <p className="inline-success">{message}</p>}
      {error && (
        <div className="empty-state compact-empty-state">
          <AlertCircle size={24} aria-hidden="true" />
          <strong>{error}</strong>
        </div>
      )}

      {isLoading && !profile ? (
        <div className="empty-state">
          <Loader2 className="spin-icon" size={28} aria-hidden="true" />
          <strong>Kraunamas profilis</strong>
        </div>
      ) : (
        <div className="inner-page-grid">
          <div className="profile-main-stack">
            <form className="form-panel" onSubmit={saveProfile}>
              <section className="form-section">
                <div className="form-section-heading">
                  <UserRound size={20} aria-hidden="true" />
                  <div>
                    <h3>Pagrindiniai duomenys</h3>
                    <span>Šie duomenys naudojami narių sąrašuose, užduotyse ir prašymuose.</span>
                  </div>
                </div>
                <div className="form-grid">
                  <TextField label="Vardas *" value={profileForm.name} onChange={(value) => setProfileForm((current) => ({ ...current, name: value }))} required />
                  <TextField label="Pavardė *" value={profileForm.surname} onChange={(value) => setProfileForm((current) => ({ ...current, surname: value }))} required />
                  <TextField label="El. paštas *" type="email" value={profileForm.email} onChange={(value) => setProfileForm((current) => ({ ...current, email: value }))} required />
                  <TextField label="Telefono numeris" value={profileForm.phone} onChange={(value) => setProfileForm((current) => ({ ...current, phone: value }))} />
                </div>
                <div className="form-actions profile-form-actions">
                  <button className="primary-button compact-primary-button" type="submit" disabled={isSavingProfile}>
                    <Save size={16} aria-hidden="true" />
                    {isSavingProfile ? "Saugoma..." : "Išsaugoti pakeitimus"}
                  </button>
                </div>
              </section>
            </form>

            <form className="form-panel" onSubmit={changePassword}>
              <section className="form-section">
                <div className="form-section-heading">
                  <KeyRound size={20} aria-hidden="true" />
                  <div>
                    <h3>Slaptažodis</h3>
                    <span>Pakeitus slaptažodį aktyvios sesijos bus atšauktos.</span>
                  </div>
                </div>
                <div className="form-grid">
                  <TextField label="Dabartinis slaptažodis" type="password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} />
                  <TextField label="Naujas slaptažodis" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
                  <TextField label="Pakartokite slaptažodį" type="password" value={passwordForm.repeatPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, repeatPassword: value }))} />
                </div>
                <div className="form-actions profile-form-actions">
                  <button className="secondary-button compact-primary-button" type="submit" disabled={isSavingPassword}>
                    {isSavingPassword ? "Keičiama..." : "Pakeisti slaptažodį"}
                  </button>
                </div>
              </section>
            </form>
          </div>

          <aside className="profile-side-stack">
            <section className="data-panel profile-summary-panel">
              <div className="profile-avatar">{initials}</div>
              <div>
                <h3>{[profileForm.name, profileForm.surname].filter(Boolean).join(" ") || "Vartotojas"}</h3>
                <span>{profileForm.email || auth?.email}</span>
              </div>
              <dl className="profile-meta-list">
                <ProfileMeta label="Sukurta" value={dateOnly(profile?.createdAt)} />
                <ProfileMeta label="Atnaujinta" value={dateOnly(profile?.updatedAt)} />
              </dl>
            </section>

            <form className="data-panel danger-panel" onSubmit={requestDeletion}>
              <div className="form-section-heading">
                <ShieldAlert size={20} aria-hidden="true" />
                <div>
                  <h3>Paskyros ištrynimas</h3>
                  <span>El. paštu gausi vienkartinę patvirtinimo nuorodą.</span>
                </div>
              </div>
              <p>Ištrynus paskyrą bus pašalinti prisijungimo ir asmeniniai duomenys. Inventoriaus audito įrašai gali likti anonimizuoti apskaitos vientisumui.</p>
              <TextField label="Slaptažodis" type="password" value={deletePassword} onChange={setDeletePassword} />
              <div className="form-actions profile-form-actions">
                <button className="secondary-button danger-border" type="submit" disabled={isRequestingDeletion}>
                  {isRequestingDeletion ? "Siunčiama..." : "Pateikti ištrynimo prašymą"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </SkautaiPageShell>
  );
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

function ProfileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "Nenurodyta"}</dd>
    </div>
  );
}

function optional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function dateOnly(value?: string) {
  return value?.slice(0, 10) ?? "";
}
