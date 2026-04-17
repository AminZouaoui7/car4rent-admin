import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogout, isAdminAuthenticated } from "../services/authService";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

export default function AdminInactivityHandler() {
  const navigate = useNavigate();
  const timeoutRef = useRef<number | null>(null);

  const resetTimer = () => {
    if (!isAdminAuthenticated()) return;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(async () => {
      await adminLogout();
      navigate("/admin/session-expired", { replace: true });
    }, INACTIVITY_LIMIT_MS);
  };

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return null;
}