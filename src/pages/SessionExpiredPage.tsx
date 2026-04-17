import { useNavigate } from "react-router-dom";
import logoCar4Rent from "../assets/logo-car4rent.png";
import "../styles/session-expired.css";

export default function SessionExpiredPage() {
  const navigate = useNavigate();

  return (
    <div className="session-expired-page">
      <div className="session-expired-bg">
        <span className="session-orb session-orb-1" />
        <span className="session-orb session-orb-2" />
        <span className="session-orb session-orb-3" />
        <div className="session-overlay" />
      </div>

      <div className="session-expired-wrapper">
        <div className="session-expired-card">
          <div className="session-logo-wrap">
            <div className="session-logo-inner">
              <img src={logoCar4Rent} alt="Car4Rent Tunisia" className="session-logo" />
            </div>
          </div>

          <span className="session-kicker">Sécurité admin</span>
          <h1>Session expirée</h1>
          <p>
            Votre session a expiré après 15 minutes d’inactivité.
            <br />
            Veuillez vous reconnecter pour continuer.
          </p>

          <button
            className="session-login-btn"
            onClick={() => navigate("/admin/login")}
          >
            Aller à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}