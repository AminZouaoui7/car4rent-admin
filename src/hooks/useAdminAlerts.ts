import { useCallback, useEffect, useRef, useState } from "react";

export type PendingAlertsResponse = {
  bookingsCount: number;
  longTermCount: number;
  transfersCount: number;
  reservationsTotal: number;
  globalTotal: number;
};

type NewItemsDiff = {
  newBookings: number;
  newLongTerms: number;
  newTransfers: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://car4rent-backend.onrender.com/api";

let sharedData: PendingAlertsResponse = {
  bookingsCount: 0,
  longTermCount: 0,
  transfersCount: 0,
  reservationsTotal: 0,
  globalTotal: 0,
};

let listeners: Array<(data: PendingAlertsResponse, diff: NewItemsDiff) => void> = [];
let pollingStarted = false;
let intervalId: number | null = null;
let previousData: PendingAlertsResponse | null = null;
let firstLoadDone = false;

async function fetchAdminAlerts() {
  const token =
    localStorage.getItem("admin_access_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken");

  try {
    const res = await fetch(`${API_BASE_URL}/admin/alerts/pending`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.error("fetchAdminAlerts failed:", res.status, res.statusText);
      return;
    }

    const data: PendingAlertsResponse = await res.json();

    let diff: NewItemsDiff = {
      newBookings: 0,
      newLongTerms: 0,
      newTransfers: 0,
    };

    if (firstLoadDone && previousData) {
      diff = {
        newBookings: Math.max(0, data.bookingsCount - previousData.bookingsCount),
        newLongTerms: Math.max(0, data.longTermCount - previousData.longTermCount),
        newTransfers: Math.max(0, data.transfersCount - previousData.transfersCount),
      };
    }

    sharedData = data;
    previousData = data;
    firstLoadDone = true;

    listeners.forEach((listener) => listener(data, diff));
  } catch (error) {
    console.error("Erreur fetchAdminAlerts:", error);
  }
}

function startPolling() {
  if (pollingStarted) return;

  pollingStarted = true;
  fetchAdminAlerts();

  intervalId = window.setInterval(() => {
    fetchAdminAlerts();
  }, 8000);
}

export function refreshAdminAlertsNow() {
  fetchAdminAlerts();
}

export function useAdminAlerts() {
  const [alerts, setAlerts] = useState<PendingAlertsResponse>(sharedData);
  const [diff, setDiff] = useState<NewItemsDiff>({
    newBookings: 0,
    newLongTerms: 0,
    newTransfers: 0,
  });

  const listenerRef = useRef<((data: PendingAlertsResponse, diff: NewItemsDiff) => void) | null>(null);

  useEffect(() => {
    const listener = (data: PendingAlertsResponse, incomingDiff: NewItemsDiff) => {
      setAlerts(data);
      setDiff(incomingDiff);
    };

    listenerRef.current = listener;
    listeners.push(listener);

    setAlerts(sharedData);
    startPolling();

    return () => {
      if (listenerRef.current) {
        listeners = listeners.filter((l) => l !== listenerRef.current);
      }

      if (listeners.length === 0 && intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
        pollingStarted = false;
      }
    };
  }, []);

  const refresh = useCallback(() => {
    refreshAdminAlertsNow();
  }, []);

  return {
    alerts,
    diff,
    refresh,
  };
}