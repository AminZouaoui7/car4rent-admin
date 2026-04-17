import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "../services/adminFetch";
import "../styles/bookings-page.css";

type Booking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age?: number;
  startDate: string;
  endDate: string;
  totalDays?: number;
  totalPrice?: number;
  status: string | number;

  isDepositPaid?: boolean;
  depositAmount?: number;
  depositPaidAt?: string;

  isFullyPaid?: boolean;
  fullyPaidAt?: string;

  pickupCityId?: string;
  returnCityId?: string;
  vehicleId?: string;
  createdAt?: string;
  updatedAt?: string;

  payments?: any[];

  vehicle?: {
    id?: string;
    brand?: string;
    model?: string;
    name?: string;
    image?: string | null;
  };

  pickupCity?: {
    id?: string;
    name?: string;
  };

  returnCity?: {
    id?: string;
    name?: string;
  };
};

type ViewTab = "today" | "tomorrow" | "week" | "all";

function normalizeStatus(status: unknown): string {
  if (typeof status === "string") {
    const s = status.toLowerCase();
    if (s.includes("pending")) return "pending";
    if (s.includes("confirm")) return "confirmed";
    if (s.includes("cancel")) return "cancelled";
    return s;
  }

  if (typeof status === "number") {
    switch (status) {
      case 1:
        return "pending";
      case 2:
        return "confirmed";
      case 3:
        return "cancelled";
      default:
        return "unknown";
    }
  }

  return "unknown";
}

function getStatusLabel(status: unknown): string {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "pending":
      return "En attente";
    case "confirmed":
      return "Confirmée";
    case "cancelled":
      return "Annulée";
    default:
      return "Inconnu";
  }
}

function getVehicleLabel(booking: Booking): string {
  if (booking.vehicle?.name) return booking.vehicle.name;

  const brand = booking.vehicle?.brand ?? "";
  const model = booking.vehicle?.model ?? "";

  if (brand || model) return `${brand} ${model}`.trim();

  return "Véhicule non renseigné";
}

function formatDate(date?: string) {
  if (!date) return "Non renseignée";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Non renseignée";

  return parsed.toLocaleDateString("fr-FR");
}

function formatDateTime(date?: string) {
  if (!date) return "Non renseignée";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Non renseignée";

  return parsed.toLocaleString("fr-FR");
}

function formatPrice(value?: number) {
  if (value === undefined || value === null) return "Non renseigné";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusPriority(status: unknown) {
  const normalized = normalizeStatus(status);
  if (normalized === "pending") return 0;
  if (normalized === "confirmed") return 1;
  if (normalized === "cancelled") return 2;
  return 3;
}

function getRemainingAmount(booking: Booking) {
  const total = booking.totalPrice ?? 0;
  const deposit = booking.isDepositPaid ? booking.depositAmount ?? 0 : 0;
  const remaining = total - deposit;
  return remaining > 0 ? remaining : 0;
}

function getPaymentLabel(booking: Booking) {
  if (booking.isFullyPaid) return "Soldée";
  if (booking.isDepositPaid) return "Acompte payé";
  return "Acompte en attente";
}

function getPaymentBadgeClass(booking: Booking) {
  if (booking.isFullyPaid) return "payment-chip payment-chip--full";
  if (booking.isDepositPaid) return "payment-chip payment-chip--deposit";
  return "payment-chip payment-chip--pending";
}

/* icons */
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
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

function isInCurrentWeek(date: Date) {
  const today = startOfDay(new Date());
  const weekEnd = endOfDay(addDays(today, 6));
  return date >= today && date <= weekEnd;
}

function getRelativeCreatedAtLabel(date?: string) {
  if (!date) return "Date inconnue";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date inconnue";

  const now = new Date().getTime();
  const diffMs = now - parsed.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours} h`;
  if (days < 7) return `il y a ${days} j`;

  return formatDateTime(date);
}

export default function BookingsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [activeTab, setActiveTab] = useState<ViewTab>("today");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const response = await adminFetch("/bookings");
      const data = await response.json().catch(() => []);

      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des réservations.");
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(id: string, status: number) {
    try {
      setActionLoadingId(id);
      setActionError("");

      const response = await adminFetch(`/bookings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la mise à jour du statut.");
      }

      const updatedBooking: Booking = data.booking ?? data;

      setBookings((prev) =>
        prev.map((booking) => (booking.id === id ? updatedBooking : booking))
      );
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function markBookingFullyPaid(id: string) {
    try {
      setActionLoadingId(id);
      setActionError("");

      const response = await adminFetch(`/bookings/${id}/mark-fully-paid`, {
        method: "PUT",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors du marquage du solde.");
      }

      const updatedBooking: Booking = data.booking ?? data;

      setBookings((prev) =>
        prev.map((booking) => (booking.id === id ? updatedBooking : booking))
      );
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const stats = useMemo(() => {
    const now = new Date();

    const todayStarts = bookings.filter((b) =>
      isSameDay(new Date(b.startDate), now)
    ).length;

    const activeNow = bookings.filter((b) => {
      const status = normalizeStatus(b.status);
      if (status !== "confirmed") return false;

      const start = startOfDay(new Date(b.startDate));
      const end = endOfDay(new Date(b.endDate));
      return now >= start && now <= end;
    }).length;

    const expectedRevenue = bookings
      .filter((b) => normalizeStatus(b.status) === "confirmed")
      .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);

    return {
      total: bookings.length,
      pending: bookings.filter((b) => normalizeStatus(b.status) === "pending").length,
      confirmed: bookings.filter((b) => normalizeStatus(b.status) === "confirmed").length,
      cancelled: bookings.filter((b) => normalizeStatus(b.status) === "cancelled").length,
      depositPaid: bookings.filter((b) => b.isDepositPaid).length,
      fullyPaid: bookings.filter((b) => b.isFullyPaid).length,
      todayStarts,
      activeNow,
      expectedRevenue,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const tomorrow = addDays(now, 1);

    const filtered = bookings.filter((booking) => {
      const normalizedStatus = normalizeStatus(booking.status);
      const start = new Date(booking.startDate);

      const matchesStatus =
        statusFilter === "all" ? true : normalizedStatus === statusFilter;

      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "today"
          ? isSameDay(start, now)
          : activeTab === "tomorrow"
          ? isSameDay(start, tomorrow)
          : isInCurrentWeek(start);

      const fullName =
        `${booking.firstName ?? ""} ${booking.lastName ?? ""}`.toLowerCase();
      const email = (booking.email ?? "").toLowerCase();
      const phone = (booking.phone ?? "").toLowerCase();
      const vehicle = getVehicleLabel(booking).toLowerCase();
      const pickupCity = (booking.pickupCity?.name ?? "").toLowerCase();
      const returnCity = (booking.returnCity?.name ?? "").toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        vehicle.includes(query) ||
        pickupCity.includes(query) ||
        returnCity.includes(query);

      return matchesStatus && matchesTab && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "priority") {
        const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
        if (statusDiff !== 0) return statusDiff;

        return (
          new Date(b.createdAt ?? b.startDate).getTime() -
          new Date(a.createdAt ?? a.startDate).getTime()
        );
      }

      if (sortBy === "recent") {
        return (
          new Date(b.createdAt ?? b.startDate).getTime() -
          new Date(a.createdAt ?? a.startDate).getTime()
        );
      }

      if (sortBy === "startDate") {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }

      if (sortBy === "priceDesc") {
        return (b.totalPrice ?? 0) - (a.totalPrice ?? 0);
      }

      return 0;
    });
  }, [bookings, search, statusFilter, sortBy, activeTab]);

  const tabCounts = useMemo(() => {
    const now = new Date();
    const tomorrow = addDays(now, 1);

    return {
      today: bookings.filter((b) => isSameDay(new Date(b.startDate), now)).length,
      tomorrow: bookings.filter((b) => isSameDay(new Date(b.startDate), tomorrow)).length,
      week: bookings.filter((b) => isInCurrentWeek(new Date(b.startDate))).length,
      all: bookings.length,
    };
  }, [bookings]);

  return (
    <div className="bookings-page-v2">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion admin</span>
          <h1>Réservations</h1>
          <p>
            Une vue plus claire pour traiter rapidement les demandes, les paiements
            et les départs à venir.
          </p>
        </div>

        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>En attente</span>
            <strong>{stats.pending}</strong>
          </div>
        </div>
      </section>

      {actionError && (
        <section className="bookings-alert">
          <div className="bookings-alert-mark">!</div>
          <div>
            <strong>Action impossible</strong>
            <p>{actionError}</p>
          </div>
          <button type="button" onClick={() => setActionError("")}>
            ×
          </button>
        </section>
      )}

      <section className="bookings-stats-grid">
        <article className="stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>

        <article className="stat-card stat-card--warning">
          <span>En attente</span>
          <strong>{stats.pending}</strong>
        </article>

        <article className="stat-card stat-card--success">
          <span>Confirmées</span>
          <strong>{stats.confirmed}</strong>
        </article>

        <article className="stat-card stat-card--danger">
          <span>Annulées</span>
          <strong>{stats.cancelled}</strong>
        </article>

        <article className="stat-card">
          <span>Départs aujourd’hui</span>
          <strong>{stats.todayStarts}</strong>
        </article>

        <article className="stat-card">
          <span>Voitures en cours</span>
          <strong>{stats.activeNow}</strong>
        </article>

        <article className="stat-card">
          <span>Acompte payé</span>
          <strong>{stats.depositPaid}</strong>
        </article>

        <article className="stat-card">
          <span>Soldées</span>
          <strong>{stats.fullyPaid}</strong>
        </article>

        <article className="stat-card stat-card--wide">
          <span>CA confirmé estimé</span>
          <strong>{formatPrice(stats.expectedRevenue)}</strong>
        </article>
      </section>

      <section className="bookings-tabs">
        <button
          type="button"
          className={activeTab === "today" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("today")}
        >
          Aujourd’hui <span>{tabCounts.today}</span>
        </button>

        <button
          type="button"
          className={activeTab === "tomorrow" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("tomorrow")}
        >
          Demain <span>{tabCounts.tomorrow}</span>
        </button>

        <button
          type="button"
          className={activeTab === "week" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("week")}
        >
          Cette semaine <span>{tabCounts.week}</span>
        </button>

        <button
          type="button"
          className={activeTab === "all" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("all")}
        >
          Tout <span>{tabCounts.all}</span>
        </button>
      </section>

      <section className="bookings-toolbar-v2">
        <div className="bookings-search">
          <input
            type="text"
            placeholder="Rechercher client, téléphone, email, véhicule, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bookings-toolbar-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmées</option>
            <option value="cancelled">Annulées</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="priority">Priorité</option>
            <option value="recent">Plus récentes</option>
            <option value="startDate">Date de début</option>
            <option value="priceDesc">Prix décroissant</option>
          </select>

          <button
            type="button"
            className="btn-neutral"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSortBy("priority");
              setActiveTab("today");
            }}
          >
            Réinitialiser
          </button>

          <button
            type="button"
            className="btn-neutral"
            onClick={loadBookings}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </section>

      {error ? (
        <section className="bookings-empty">
          <h3>Erreur</h3>
          <p>{error}</p>
        </section>
      ) : loading ? (
        <section className="longterm-cards">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="longterm-card" key={index} style={{ opacity: 0.6, pointerEvents: 'none' }}>
              <div className="longterm-card__image skeleton-line" style={{ height: 160, borderRadius: 18 }} />
              <div className="longterm-card__main">
                <div className="skeleton-line skeleton-line--lg" style={{ marginBottom: 12 }} />
                <div className="skeleton-line skeleton-line--md" style={{ marginBottom: 20 }} />
                <div className="longterm-card__meta">
                  <div className="skeleton-line" style={{ width: '80%' }} />
                  <div className="skeleton-line" style={{ width: '70%' }} />
                  <div className="skeleton-line" style={{ width: '90%' }} />
                  <div className="skeleton-line" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="longterm-card__pricing">
                <div className="skeleton-line" style={{ height: 44, borderRadius: 14 }} />
                <div className="skeleton-line" style={{ height: 44, borderRadius: 14 }} />
              </div>
              <div className="longterm-card__actions">
                <div className="skeleton-line" style={{ height: 38, borderRadius: 12 }} />
                <div className="skeleton-line" style={{ height: 38, borderRadius: 12 }} />
              </div>
            </article>
          ))}
        </section>
      ) : filteredBookings.length === 0 ? (
        <section className="bookings-empty">
          <h3>Aucune réservation trouvée</h3>
          <p>Essaie de modifier les filtres ou la recherche.</p>
        </section>
      ) : (
        <section className="longterm-cards">
          {filteredBookings.map((booking) => {
            const normalizedStatus = normalizeStatus(booking.status);

            const canMarkFullyPaid =
              normalizedStatus === "confirmed" &&
              booking.isDepositPaid &&
              !booking.isFullyPaid;

            return (
              <article
                className={`longterm-card longterm-card--${normalizedStatus}`}
                key={booking.id}
              >
                <div className="longterm-card__image">
                  <img
                    src={
                      booking.vehicle?.image ||
                      "https://via.placeholder.com/420x260/f3f7fb/9aa9bb?text=Car4Rent"
                    }
                    alt={getVehicleLabel(booking)}
                  />
                  <span className={`status-chip status-chip--${normalizedStatus}`}>
                    {getStatusLabel(booking.status)}
                  </span>
                </div>

                <div className="longterm-card__main">
                  <div className="longterm-card__head">
                    <div>
                      <h3>
                        {booking.firstName} {booking.lastName}
                      </h3>
                      <p className="longterm-card__vehicle">
                        {getVehicleLabel(booking)}
                      </p>
                    </div>

                    <span className="longterm-card__created">
                      {getRelativeCreatedAtLabel(booking.createdAt)}
                    </span>
                  </div>

                  <div className="longterm-card__meta">
                    <div className="meta-item">
                      <IconCalendar />
                      <span>Du : {formatDate(booking.startDate)}</span>
                    </div>
                    <div className="meta-item">
                      <IconCalendar />
                      <span>Au : {formatDate(booking.endDate)}</span>
                    </div>
                    <div className="meta-item">
                      <IconMapPin />
                      <span>Départ : {booking.pickupCity?.name || "—"}</span>
                    </div>
                    <div className="meta-item">
                      <IconMapPin />
                      <span>Retour : {booking.returnCity?.name || "—"}</span>
                    </div>
                    <div className="meta-item">
                      <IconPhone />
                      <span>{booking.phone || "—"}</span>
                    </div>
                    <div className="meta-item">
                      <IconMail />
                      <span>{booking.email || "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="longterm-card__pricing">
                  <div className="longterm-price-box">
                    <small>Total</small>
                    <strong>{formatPrice(booking.totalPrice)}</strong>
                  </div>

                  <div className="longterm-price-box">
                    <small>Reste à payer</small>
                    <strong>{formatPrice(getRemainingAmount(booking))}</strong>
                  </div>

                  <div className="longterm-price-box">
                    <small>Acompte</small>
                    <strong className={getPaymentBadgeClass(booking)}>
                      {getPaymentLabel(booking).replace("Acompte ", "")}
                    </strong>
                  </div>
                </div>

                <div className="longterm-card__actions">
                  <button
                    type="button"
                    className="btn-neutral"
                    onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                  >
                    Détail
                  </button>

                  {normalizedStatus === "pending" && (
                    <button
                      type="button"
                      className="btn-confirm"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => updateBookingStatus(booking.id, 2)}
                    >
                      {actionLoadingId === booking.id ? "..." : "Confirmer"}
                    </button>
                  )}

                  {normalizedStatus !== "cancelled" && (
                    <button
                      type="button"
                      className="btn-cancel"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => updateBookingStatus(booking.id, 3)}
                    >
                      {actionLoadingId === booking.id ? "..." : "Annuler"}
                    </button>
                  )}

                  {canMarkFullyPaid && (
                    <button
                      type="button"
                      className="btn-paid"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => markBookingFullyPaid(booking.id)}
                    >
                      {actionLoadingId === booking.id ? "..." : "Soldée"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}