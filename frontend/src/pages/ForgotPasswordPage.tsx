import { Link } from "react-router-dom";
import { ArrowLeft, MailQuestion } from "lucide-react";

export function ForgotPasswordPage() {
  return (
    <main className="auth-form-page">
      <section className="form-panel auth-form-panel">
        <Link className="back-link" to="/login">
          <ArrowLeft size={17} aria-hidden="true" />
          Atgal į prisijungimą
        </Link>
        <div className="form-section">
          <div className="form-section-heading">
            <MailQuestion size={20} aria-hidden="true" />
            <div>
              <h2>Slaptažodžio atkūrimas</h2>
              <span>Šis srautas yra Android programėlėje; web formą prijungsime prie atkūrimo endpointų kitame žingsnyje.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
