import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { adminFetch } from "../services/adminFetch";
import Alert from "../components/Alert";
import "../styles/dashboard.css";

type Booking = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  startDate: string;
  endDate: string;
  status: string | number;
  totalPrice?: number;
  depositAmount?: number;
  isDepositPaid?: boolean;
  isFullyPaid?: boolean;
  depositPaidAt?: string;
  fullyPaidAt?: string;
  vehicle?: {
    brand?: string;
    model?: string;
    image?: string;
  };
};

type Vehicle = {
  id: string;
  available: boolean;
  brand?: string;
  model?: string;
  image?: string;
};

type FlowItem = {
  id: string;
  type: "entry" | "exit";
  date: Date;
  booking: Booking;
};

type FlowTab = "today" | "tomorrow" | "week";
type PeriodFilter = "all" | "7d" | "30d" | "month";

function normalizeStatus(status: unknown): string {
  if (typeof status === "string") return status.toLowerCase();

  if (typeof status === "number") {
    if (status === 1) return "pending";
    if (status === 2) return "confirmed";
    if (status === 3) return "cancelled";
  }

  return "unknown";
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("fr-FR");
}

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getRangeLabel(tab: FlowTab) {
  if (tab === "today") return "Aujourd’hui";
  if (tab === "tomorrow") return "Demain";
  return "Cette semaine";
}

function isDateInRange(date: Date, start: Date, end: Date) {
  const value = date.getTime();
  return value >= start.getTime() && value <= end.getTime();
}

function isBookingActiveToday(startDate: string, endDate: string) {
  const today = new Date();
  const start = startOfDay(new Date(startDate));
  const end = endOfDay(new Date(endDate));
  return today >= start && today <= end;
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getCollectedAmount(booking: Booking) {
  const totalPrice = Number(booking.totalPrice || 0);
  const depositAmount = Number(booking.depositAmount || 0);

  if (booking.isFullyPaid) {
    return totalPrice;
  }

  if (booking.isDepositPaid) {
    return Math.min(depositAmount, totalPrice);
  }

  return 0;
}

function getBookingClientName(booking: Booking) {
  return `${booking.firstName || ""} ${booking.lastName || ""}`.trim() || "Client";
}

function getBookingVehicleName(booking: Booking) {
  const brand = booking.vehicle?.brand || "";
  const model = booking.vehicle?.model || "";
  const full = `${brand} ${model}`.trim();
  return full || "Véhicule non renseigné";
}

function getStatusLabel(status: unknown) {
  const normalized = normalizeStatus(status);
  if (normalized === "pending") return "En attente";
  if (normalized === "confirmed") return "Confirmée";
  if (normalized === "cancelled") return "Annulée";
  return "Inconnu";
}

function getPaymentLabel(booking: Booking) {
  if (booking.isFullyPaid) return "Payée";
  if (booking.isDepositPaid) return "Acompte payé";
  return "Non payée";
}

function getPaymentClassName(booking: Booking) {
  if (booking.isFullyPaid) return "full";
  if (booking.isDepositPaid) return "deposit";
  return "pending";
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FlowTab>("today");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setError("");

      const [bookingsRes, vehiclesRes] = await Promise.all([
        adminFetch("/bookings"),
        adminFetch("/vehicles"),
      ]);

      const bookingsData = await bookingsRes.json();
      const vehiclesData = await vehiclesRes.json();

      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement du tableau de bord.");
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = useMemo(() => {
    return bookings.filter((b) => normalizeStatus(b.status) === "pending").length;
  }, [bookings]);

  const confirmedCount = useMemo(() => {
    return bookings.filter((b) => normalizeStatus(b.status) === "confirmed").length;
  }, [bookings]);

  const cancelledCount = useMemo(() => {
    return bookings.filter((b) => normalizeStatus(b.status) === "cancelled").length;
  }, [bookings]);

  const totalVehiclesCount = useMemo(() => vehicles.length, [vehicles]);

  const activeVehiclesCount = useMemo(() => {
    return vehicles.filter((v) => v.available === true).length;
  }, [vehicles]);

  const inactiveVehiclesCount = useMemo(() => {
    return vehicles.filter((v) => v.available === false).length;
  }, [vehicles]);

  const activeReservationsToday = useMemo(() => {
    return bookings.filter(
      (b) =>
        normalizeStatus(b.status) === "confirmed" &&
        isBookingActiveToday(b.startDate, b.endDate)
    ).length;
  }, [bookings]);

  const bookingValidationRate = useMemo(() => {
    return getPercent(confirmedCount, bookings.length);
  }, [confirmedCount, bookings.length]);

  const fleetAvailabilityRate = useMemo(() => {
    return getPercent(activeVehiclesCount, totalVehiclesCount);
  }, [activeVehiclesCount, totalVehiclesCount]);

  const confirmedBookings = useMemo(() => {
    return bookings.filter((b) => normalizeStatus(b.status) === "confirmed");
  }, [bookings]);

  const periodConfirmedBookings = useMemo(() => {
    if (periodFilter === "all") return confirmedBookings;

    const now = endOfDay(new Date());
    let start: Date;

    if (periodFilter === "7d") {
      start = startOfDay(addDays(new Date(), -6));
    } else if (periodFilter === "30d") {
      start = startOfDay(addDays(new Date(), -29));
    } else {
      const d = new Date();
      start = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    return confirmedBookings.filter((b) => {
      const d = new Date(b.startDate);
      return d >= start && d <= now;
    });
  }, [confirmedBookings, periodFilter]);

  const totalRevenue = useMemo(() => {
    return periodConfirmedBookings.reduce((sum, booking) => {
      return sum + Number(booking.totalPrice || 0);
    }, 0);
  }, [periodConfirmedBookings]);

  const totalDepositsReceived = useMemo(() => {
    return periodConfirmedBookings.reduce((sum, booking) => {
      if (!booking.isDepositPaid || booking.isFullyPaid) return sum;
      return sum + Number(booking.depositAmount || 0);
    }, 0);
  }, [periodConfirmedBookings]);

  const totalFullyPaidRevenue = useMemo(() => {
    return periodConfirmedBookings.reduce((sum, booking) => {
      if (!booking.isFullyPaid) return sum;
      return sum + Number(booking.totalPrice || 0);
    }, 0);
  }, [periodConfirmedBookings]);

  const totalCollectedAmount = useMemo(() => {
    return periodConfirmedBookings.reduce((sum, booking) => {
      return sum + getCollectedAmount(booking);
    }, 0);
  }, [periodConfirmedBookings]);

  const remainingToCollect = useMemo(() => {
    const remaining = totalRevenue - totalCollectedAmount;
    return remaining > 0 ? remaining : 0;
  }, [totalRevenue, totalCollectedAmount]);

  const depositPaidCount = useMemo(() => {
    return periodConfirmedBookings.filter((b) => b.isDepositPaid && !b.isFullyPaid).length;
  }, [periodConfirmedBookings]);

  const fullyPaidCount = useMemo(() => {
    return periodConfirmedBookings.filter((b) => b.isFullyPaid).length;
  }, [periodConfirmedBookings]);

  const unpaidCount = useMemo(() => {
    return periodConfirmedBookings.filter((b) => getCollectedAmount(b) === 0).length;
  }, [periodConfirmedBookings]);

  const balanceRemainingCount = useMemo(() => {
    return periodConfirmedBookings.filter((b) => {
      const totalPrice = Number(b.totalPrice || 0);
      const collected = getCollectedAmount(b);
      return collected > 0 && collected < totalPrice;
    }).length;
  }, [periodConfirmedBookings]);

  const paymentCollectedPercent = useMemo(() => {
    return getPercent(totalCollectedAmount, totalRevenue);
  }, [totalCollectedAmount, totalRevenue]);

  const todayEntries = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    return confirmedBookings.filter((b) => {
      const d = new Date(b.startDate);
      return d >= start && d <= end;
    }).length;
  }, [confirmedBookings]);

  const todayExits = useMemo(() => {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    return confirmedBookings.filter((b) => {
      const d = new Date(b.endDate);
      return d >= start && d <= end;
    }).length;
  }, [confirmedBookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
      .slice(0, 6);
  }, [bookings]);

  const range = useMemo(() => {
    const today = startOfDay(new Date());

    if (activeTab === "today") {
      return {
        start: today,
        end: endOfDay(today),
      };
    }

    if (activeTab === "tomorrow") {
      const tomorrow = startOfDay(addDays(today, 1));
      return {
        start: tomorrow,
        end: endOfDay(tomorrow),
      };
    }

    return {
      start: today,
      end: endOfDay(addDays(today, 6)),
    };
  }, [activeTab]);

  const vehicleFlow = useMemo<FlowItem[]>(() => {
    return confirmedBookings
      .flatMap((booking) => {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);

        const items: FlowItem[] = [];

        if (isDateInRange(startDate, range.start, range.end)) {
          items.push({
            id: `${booking.id}-entry`,
            type: "entry",
            date: startDate,
            booking,
          });
        }

        if (isDateInRange(endDate, range.start, range.end)) {
          items.push({
            id: `${booking.id}-exit`,
            type: "exit",
            date: endDate,
            booking,
          });
        }

        return items;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [confirmedBookings, range]);

  const entriesCount = useMemo(() => {
    return vehicleFlow.filter((item) => item.type === "entry").length;
  }, [vehicleFlow]);

  const exitsCount = useMemo(() => {
    return vehicleFlow.filter((item) => item.type === "exit").length;
  }, [vehicleFlow]);

  return (
    <div className="dashboard-premium-page">
      <section className="dashboard-premium-hero">
        <div className="dashboard-premium-hero__content">
          <span className="dashboard-premium-kicker">Centre de pilotage</span>
          <h1>Dashboard Car4Rent</h1>
          <p>
            Une vue premium sur les réservations, la flotte, les encaissements
            et les mouvements véhicules pour piloter l’activité admin plus
            clairement.
          </p>

          <div className="dashboard-premium-hero__actions">
            <button
              type="button"
              className="dashboard-btn dashboard-btn--primary"
              onClick={loadDashboardData}
              disabled={loading}
            >
              {loading ? "Chargement..." : "Actualiser les données"}
            </button>

            <div className="dashboard-inline-note">
              <span className="dashboard-inline-dot" />
              Données en temps réel admin
            </div>
          </div>
        </div>

        <div className="dashboard-premium-hero__side">
          <div className="hero-glass-card hero-glass-card--main">
            <span>Réservations confirmées</span>
            <strong>{confirmedCount}</strong>
            <small>{bookingValidationRate}% du total</small>
          </div>

          <div className="hero-glass-grid">
            <div className="hero-glass-card">
              <span>Actives aujourd’hui</span>
              <strong>{activeReservationsToday}</strong>
            </div>
            <div className="hero-glass-card">
              <span>Flotte dispo</span>
              <strong>{fleetAvailabilityRate}%</strong>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="dashboard-alert-wrap">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <section className="dashboard-kpi-showcase">
  <div className="dashboard-kpi-showcase__main">
    <div className="dashboard-kpi-showcase__main-top">
      <span className="dashboard-kpi-showcase__eyebrow">Vue d’ensemble</span>
      <span className="dashboard-kpi-showcase__status">
        {bookings.length} réservations enregistrées
      </span>
    </div>

    <div className="dashboard-kpi-showcase__hero">
      <div>
        <p className="dashboard-kpi-showcase__label">Réservations confirmées</p>
        <h2>{confirmedCount}</h2>
        <span className="dashboard-kpi-showcase__sub">
          {bookingValidationRate}% du total des réservations
        </span>
      </div>

      <div className="dashboard-kpi-showcase__ring-wrap">
        <div
          className="dashboard-kpi-mini-ring"
          style={
            {
              "--progress": `${bookingValidationRate}%`,
            } as CSSProperties
          }
        >
          <div className="dashboard-kpi-mini-ring__inner">
            <strong>{bookingValidationRate}%</strong>
            <span>validé</span>
          </div>
        </div>
      </div>
    </div>

    <div className="dashboard-kpi-showcase__footer">
      <div className="dashboard-kpi-foot-card">
        <span>En attente</span>
        <strong>{pendingCount}</strong>
      </div>

      <div className="dashboard-kpi-foot-card">
        <span>Annulées</span>
        <strong>{cancelledCount}</strong>
      </div>

      <div className="dashboard-kpi-foot-card">
        <span>Actives aujourd’hui</span>
        <strong>{activeReservationsToday}</strong>
      </div>
    </div>
  </div>

  <div className="dashboard-kpi-showcase__side">
    <article className="dashboard-kpi-tile">
      <span>Réservations totales</span>
      <strong>{bookings.length}</strong>
      <small>Toutes les demandes enregistrées</small>
    </article>

    <article className="dashboard-kpi-tile">
      <span>Voitures actives</span>
      <strong>{activeVehiclesCount}</strong>
      <small>Disponibles à la location</small>
    </article>

    <article className="dashboard-kpi-tile">
      <span>Voitures inactives</span>
      <strong>{inactiveVehiclesCount}</strong>
      <small>Indisponibles ou retirées</small>
    </article>

    <article className="dashboard-kpi-tile">
      <span>Taux flotte dispo</span>
      <strong>{fleetAvailabilityRate}%</strong>
      <small>{totalVehiclesCount} véhicules au total</small>
    </article>
  </div>
</section>

      <section className="dashboard-premium-grid">
        <div className="dashboard-main-stack">
          <section className="dashboard-panel-premium">
            <div className="dashboard-panel-premium__head">
              <div>
                <span className="panel-mini-kicker">Vue business</span>
                <h2>Paiements & performance</h2>
                <p>
                  Lecture rapide des encaissements sur les réservations confirmées.
                </p>
              </div>

              <div className="dashboard-panel-premium__actions">
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                >
                  <option value="all">Toute période</option>
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="month">Ce mois</option>
                </select>
              </div>
            </div>

            <div className="payment-premium-layout">
              <div className="payment-ring-card">
                <div
                  className="payment-ring-premium"
                  style={
                    {
                      "--progress": `${paymentCollectedPercent}%`,
                    } as CSSProperties
                  }
                >
                  <div className="payment-ring-premium__inner">
                    <strong>{paymentCollectedPercent}%</strong>
                    <span>encaissé</span>
                  </div>
                </div>

                <div className="payment-ring-legend">
                  <h3>{formatPrice(totalCollectedAmount)}</h3>
                  <p>Montant encaissé sur {formatPrice(totalRevenue)}</p>
                </div>
              </div>

              <div className="payment-cards-grid">
                <article className="mini-payment-card">
                  <span>CA confirmé</span>
                  <strong>{formatPrice(totalRevenue)}</strong>
                  <small>Réservations confirmées</small>
                </article>

                <article className="mini-payment-card">
                  <span>Acomptes encaissés</span>
                  <strong>{formatPrice(totalDepositsReceived)}</strong>
                  <small>{depositPaidCount} réservations</small>
                </article>

                <article className="mini-payment-card">
                  <span>Réservations soldées</span>
                  <strong>{fullyPaidCount}</strong>
                  <small>{formatPrice(totalFullyPaidRevenue)} encaissés</small>
                </article>

                <article className="mini-payment-card mini-payment-card--warning">
                  <span>Reste à encaisser</span>
                  <strong>{formatPrice(remainingToCollect)}</strong>
                  <small>{balanceRemainingCount} avec solde</small>
                </article>
              </div>
            </div>

            <div className="dashboard-chip-stats">
              <div className="dashboard-chip-stat">
                <span>Sans paiement</span>
                <strong>{unpaidCount}</strong>
              </div>
              <div className="dashboard-chip-stat">
                <span>Acompte seulement</span>
                <strong>{depositPaidCount}</strong>
              </div>
              <div className="dashboard-chip-stat">
                <span>Complètement payées</span>
                <strong>{fullyPaidCount}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-panel-premium">
            <div className="dashboard-panel-premium__head">
              <div>
                <span className="panel-mini-kicker">Mouvements</span>
                <h2>Flux véhicules</h2>
                <p>
                  Entrées et sorties calculées sur les réservations confirmées.
                </p>
              </div>
            </div>

            <div className="flow-tabs-premium">
              <button
                type="button"
                className={`flow-tab-premium ${activeTab === "today" ? "active" : ""}`}
                onClick={() => setActiveTab("today")}
              >
                Aujourd’hui
              </button>

              <button
                type="button"
                className={`flow-tab-premium ${activeTab === "tomorrow" ? "active" : ""}`}
                onClick={() => setActiveTab("tomorrow")}
              >
                Demain
              </button>

              <button
                type="button"
                className={`flow-tab-premium ${activeTab === "week" ? "active" : ""}`}
                onClick={() => setActiveTab("week")}
              >
                Cette semaine
              </button>
            </div>

            <div className="dashboard-chip-stats">
              <div className="dashboard-chip-stat">
                <span>Vue active</span>
                <strong>{getRangeLabel(activeTab)}</strong>
              </div>
              <div className="dashboard-chip-stat">
                <span>Entrées</span>
                <strong>{entriesCount}</strong>
              </div>
              <div className="dashboard-chip-stat">
                <span>Sorties</span>
                <strong>{exitsCount}</strong>
              </div>
              <div className="dashboard-chip-stat">
                <span>Total mouvements</span>
                <strong>{vehicleFlow.length}</strong>
              </div>
            </div>

            {loading && (
              <div className="dashboard-empty-premium">
                Chargement du flux...
              </div>
            )}

            {!loading && vehicleFlow.length === 0 && (
              <div className="dashboard-empty-premium">
                Aucun mouvement trouvé pour <strong>{getRangeLabel(activeTab)}</strong>.
              </div>
            )}

            {!loading && vehicleFlow.length > 0 && (
              <div className="timeline-premium">
                {vehicleFlow.map((item) => (
                  <div
                    key={item.id}
                    className={`timeline-premium__item ${
                      item.type === "entry" ? "entry" : "exit"
                    }`}
                  >
                    <div className="timeline-premium__line" />
                    <div className="timeline-premium__dot" />

                    <div className="timeline-premium__card">
                      <div className="timeline-premium__top">
                        <div>
                          <h4>{getBookingClientName(item.booking)}</h4>
                          <p>{getBookingVehicleName(item.booking)}</p>
                        </div>

                        <span
                          className={`timeline-premium__badge ${
                            item.type === "entry" ? "entry" : "exit"
                          }`}
                        >
                          {item.type === "entry" ? "Entrée" : "Sortie"}
                        </span>
                      </div>

                      <div className="timeline-premium__meta">
                        <span>{item.booking.email || "Email non renseigné"}</span>
                        <span>{item.booking.phone || "Téléphone non renseigné"}</span>
                        <span>Mouvement : {formatDate(item.date)}</span>
                      </div>

                      <div className="timeline-premium__period">
                        Du {formatDate(item.booking.startDate)} au{" "}
                        {formatDate(item.booking.endDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-side-stack-premium">
          <section className="dashboard-panel-premium dashboard-panel-premium--side">
            <div className="dashboard-panel-premium__head">
              <div>
                <span className="panel-mini-kicker">Snapshot</span>
                <h2>Activité du jour</h2>
              </div>
            </div>

            <div className="activity-grid">
              <article className="activity-card">
                <span>Départs aujourd’hui</span>
                <strong>{todayEntries}</strong>
              </article>

              <article className="activity-card">
                <span>Retours aujourd’hui</span>
                <strong>{todayExits}</strong>
              </article>

              <article className="activity-card">
                <span>Réservations actives</span>
                <strong>{activeReservationsToday}</strong>
              </article>

              <article className="activity-card">
                <span>Taux flotte dispo</span>
                <strong>{fleetAvailabilityRate}%</strong>
              </article>
            </div>
          </section>

          <section className="dashboard-panel-premium dashboard-panel-premium--side">
            <div className="dashboard-panel-premium__head">
              <div>
                <span className="panel-mini-kicker">Dernières demandes</span>
                <h2>Réservations récentes</h2>
              </div>
            </div>

            <div className="recent-bookings-list">
              {recentBookings.length === 0 && (
                <div className="dashboard-empty-premium">
                  Aucune réservation récente.
                </div>
              )}

              {recentBookings.map((booking) => (
                <article key={booking.id} className="recent-booking-card">
                  <div className="recent-booking-card__top">
                    <div>
                      <h4>{getBookingClientName(booking)}</h4>
                      <p>{getBookingVehicleName(booking)}</p>
                    </div>

                    <span
                      className={`recent-status-chip recent-status-chip--${normalizeStatus(
                        booking.status
                      )}`}
                    >
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>

                  <div className="recent-booking-card__meta">
                    <span>{booking.email || "Email non renseigné"}</span>
                    <span>{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</span>
                  </div>

                  <div className="recent-booking-card__bottom">
                    <strong>{formatPrice(Number(booking.totalPrice || 0))}</strong>

                    <span
                      className={`recent-payment-chip recent-payment-chip--${getPaymentClassName(
                        booking
                      )}`}
                    >
                      {getPaymentLabel(booking)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-panel-premium dashboard-panel-premium--side">
            <div className="dashboard-panel-premium__head">
              <div>
                <span className="panel-mini-kicker">Résumé flotte</span>
                <h2>Indicateurs clés</h2>
              </div>
            </div>

            <div className="insight-list">
              <div className="insight-row">
                <span>Parc total</span>
                <strong>{totalVehiclesCount}</strong>
              </div>
              <div className="insight-row">
                <span>Voitures disponibles</span>
                <strong>{activeVehiclesCount}</strong>
              </div>
              <div className="insight-row">
                <span>Voitures indisponibles</span>
                <strong>{inactiveVehiclesCount}</strong>
              </div>
              <div className="insight-row">
                <span>Dernière actualisation</span>
                <strong>{formatDateTime(new Date())}</strong>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}