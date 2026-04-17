import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";
import { removeAdminToken } from "../services/authService";

export default function AdminNavbar() {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const confirmLogout = useCallback(() => {
    removeAdminToken();
    navigate("/admin/login");
  }, [navigate]);

  return (
    <header className="admin-navbar">
      <div className="admin-navbar-left">
        <span className="admin-navbar-kicker">Panneau d’administration</span>
        <h1>Car4Rent Admin</h1>
        <p>Gérez les réservations, véhicules, tarifs et saisons.</p>
      </div>

      <div className="admin-navbar-right">
        <div className="admin-date-chip">
          <span className="admin-date-dot" />
          <span>{today}</span>
        </div>
        <button
          type="button"
          className="admin-logout-btn"
          onClick={() => setShowConfirm(true)}
        >
          ⎋ Déconnexion
        </button>
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Confirmer la déconnexion"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmLabel="Se déconnecter"
        cancelLabel="Annuler"
        onConfirm={confirmLogout}
        onCancel={() => setShowConfirm(false)}
      />
    </header>
  );
}
