import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";
import Alert from "./Alert";
import { removeAdminToken } from "../services/authService";
import { useAdminAlerts } from "../hooks/useAdminAlerts";

type ToastState = {
  visible: boolean;
  message: string;
  targetPath: string;
};

type AdminNavbarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export default function AdminNavbar({ isSidebarOpen, onToggleSidebar }: AdminNavbarProps) {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    targetPath: "",
  });

  const toastTimeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();
  const { alerts, diff } = useAdminAlerts();

  const confirmLogout = useCallback(() => {
    removeAdminToken();
    navigate("/admin/login");
  }, [navigate]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };
    } catch (error) {
      console.error("Impossible de jouer le son :", error);
    }
  }, []);

  const showToast = useCallback(
    (message: string, targetPath: string) => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }

      setToast({
        visible: true,
        message,
        targetPath,
      });

      playNotificationSound();

      toastTimeoutRef.current = window.setTimeout(() => {
        setToast({
          visible: false,
          message: "",
          targetPath: "",
        });
      }, 5000);
    },
    [playNotificationSound]
  );

  const handleToastClick = useCallback(() => {
    if (!toast.targetPath) return;

    setToast({
      visible: false,
      message: "",
      targetPath: "",
    });

    navigate(toast.targetPath);
  }, [navigate, toast.targetPath]);

  const handleBellClick = useCallback(() => {
    if (alerts.transfersCount > 0) {
      navigate("/admin/transfers");
      return;
    }

    if (alerts.longTermCount > 0) {
      navigate("/admin/long-term-bookings");
      return;
    }

    navigate("/admin/bookings");
  }, [alerts.transfersCount, alerts.longTermCount, navigate]);

  useEffect(() => {
    if (diff.newBookings > 0) {
      showToast(
        diff.newBookings === 1
          ? "Nouvelle réservation simple"
          : `${diff.newBookings} nouvelles réservations simples`,
        "/admin/bookings"
      );
      return;
    }

    if (diff.newLongTerms > 0) {
      showToast(
        diff.newLongTerms === 1
          ? "Nouvelle demande longue durée"
          : `${diff.newLongTerms} nouvelles demandes longue durée`,
        "/admin/long-term-bookings"
      );
      return;
    }

    if (diff.newTransfers > 0) {
      showToast(
        diff.newTransfers === 1
          ? "Nouveau transfert"
          : `${diff.newTransfers} nouveaux transferts`,
        "/admin/transfers"
      );
    }
  }, [diff, showToast]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <header className="admin-navbar">
        <button
          type="button"
          className={`admin-hamburger mobile-only ${isSidebarOpen ? "is-open" : ""}`}
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isSidebarOpen}
          aria-controls="admin-sidebar"
        >
          <span className="admin-hamburger-box" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <div className="admin-navbar-left">
          <span className="admin-navbar-kicker">Panneau d’administration</span>
          <h1>Car4Rent Admin</h1>
          <p>Gérez les réservations, véhicules, tarifs et saisons.</p>
        </div>

        <div className="admin-navbar-right">
          <button
            type="button"
            className="admin-bell"
            onClick={handleBellClick}
            aria-label="Voir les alertes"
            title="Voir les alertes"
          >
            <span className="admin-bell-icon">🔔</span>

            {alerts.globalTotal > 0 && (
              <span className="admin-bell-badge">
                {alerts.globalTotal > 99 ? "99+" : alerts.globalTotal}
              </span>
            )}
          </button>

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

      {toast.visible && (
        <Alert
          kind="info"
          className="alert--toast alert--clickable"
          onClose={() =>
            setToast({
              visible: false,
              message: "",
              targetPath: "",
            })
          }
          onClick={handleToastClick}
        >
          <div className="admin-toast-content">
            <div className="admin-toast-title">Nouvelle activité</div>
            <div className="admin-toast-message">{toast.message}</div>
            <div className="admin-toast-hint">Cliquer pour ouvrir</div>
          </div>
        </Alert>
      )}
    </>
  );
}
