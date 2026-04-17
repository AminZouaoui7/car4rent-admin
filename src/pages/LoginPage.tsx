import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoCar4Rent from "../assets/logo-car4rent.png";
import { adminLogin, saveAdminSession } from "../services/authService";
import Alert from "../components/Alert";
import "../styles/login.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await adminLogin({
        email: email.trim(),
        password,
      });

      saveAdminSession(data);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Échec de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />

        <span className="wave-ring wave-ring-1" />
        <span className="wave-ring wave-ring-2" />
        <span className="wave-ring wave-ring-3" />
        <span className="wave-ring wave-ring-4" />

        <span className="particle particle-1" />
        <span className="particle particle-2" />
        <span className="particle particle-3" />
        <span className="particle particle-4" />
        <span className="particle particle-5" />
        <span className="particle particle-6" />
        <span className="particle particle-7" />
        <span className="particle particle-8" />

        <div className="login-overlay" />
      </div>

      <div className="login-wrapper login-wrapper--center">
        <div className="login-card">
          <div className="login-logo-wrap">
            <img src={logoCar4Rent} alt="Car4Rent Tunisia" className="login-logo" />
          </div>

          <div className="login-top login-top--center">
            <div>
              <span className="login-kicker">Espace sécurisé</span>
              <h2>Connexion Admin</h2>
            </div>
          </div>

          {error && <Alert kind="error">{error}</Alert>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Email administrateur</label>
              <input
                type="email"
                placeholder="admin@carrent.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Se souvenir de moi</span>
              </label>

              <button type="button" className="forgot-link">
                Mot de passe oublié ?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}