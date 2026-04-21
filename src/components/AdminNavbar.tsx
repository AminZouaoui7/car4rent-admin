import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";
import Alert from "./Alert";
import { removeAdminToken } from "../services/authService";

type PendingAlertsResponse = {
  bookingsCount: number;
  longTermCount: number;
  transfersCount: number;
  reservationsTotal: number;
  globalTotal: number;
};

type ToastState = {
  visible: boolean;
  message: string;
  targetPath: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5167";

export default function AdminNavbar() {
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

  const previousCountsRef = useRef<PendingAlertsResponse | null>(null);
  const firstLoadRef = useRef(true);
  const toastTimeoutRef = useRef<number | null>(null);

  const navigate = useNavigate();

  const confirmLogout = useCallback(() => {
    removeAdminToken();
    navigate("/admin/login");
  }, [navigate]);

  const playNotificationSound = useCallback(() => {
    try {
      const AudioContextClass =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      oscillator.onended = () => {
        audioContext.close().catch(() => {});
      };
    } catch (error) {
      console.error("Impossible de jouer le son de notification :", error);
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

  useEffect(() => {
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken");

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/alerts/pending`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data: PendingAlertsResponse = await res.json();

        if (firstLoadRef.current) {
          previousCountsRef.current = data;
          firstLoadRef.current = false;
          return;
        }

        const previous = previousCountsRef.current;

        if (previous) {
          const newBookings = data.bookingsCount - previous.bookingsCount;
          const newLongTerms = data.longTermCount - previous.longTermCount;
          const newTransfers = data.transfersCount - previous.transfersCount;

          if (newBookings > 0) {
            showToast(
              newBookings === 1
                ? "Nouvelle réservation simple"
                : `${newBookings} nouvelles réservations simples`,
              "/admin/bookings"
            );
          } else if (newLongTerms > 0) {
            showToast(
              newLongTerms === 1
                ? "Nouvelle demande longue durée"
                : `${newLongTerms} nouvelles demandes longue durée`,
              "/admin/long-term-bookings"
            );
          } else if (newTransfers > 0) {
            showToast(
              newTransfers === 1
                ? "Nouveau transfert"
                : `${newTransfers} nouveaux transferts`,
              "/admin/transfers"
            );
          }
        }

        previousCountsRef.current = data;
      } catch (error) {
        console.error("Erreur alertes navbar:", error);
      }
    };

    fetchAlerts();

    const interval = window.setInterval(fetchAlerts, 8000);

    return () => {
      window.clearInterval(interval);
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [showToast]);

  return (
    <>
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