import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch } from "../services/adminFetch";
import "../styles/bookings-page.css";

type LongTermBooking = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  startDate: string;
  durationMonths: number;
  pickupCityId?: string;
  vehicleId?: string;
  notes?: string | null;
  status: string;
  proposedMonthlyPrice?: number | null;
  proposedTotalPrice?: number | null;
  isQuoteSent?: boolean;
  createdAt?: string;

  pickupCity?: {
    id?: string;
    name?: string;
  };

  vehicle?: {
    id?: string;
    brand?: string;
    model?: string;
    name?: string;
    image?: string | null;
    category?: {
      id?: string;
      name?: string;
    };
  };
};

type ViewTab = "pending" | "quoted" | "approved" | "all";

function normalizeStatus(status: unknown): string {
  if (typeof status !== "string") return "unknown";

  const s = status.toLowerCase();

  if (s.includes("pending")) return "pending";
  if (s.includes("quoted")) return "quoted";
  if (s.includes("approved")) return "approved";
  if (s.includes("rejected")) return "rejected";

  return s;
}

function getStatusLabel(status: unknown): string {
  const normalized = normalizeStatus(status);

  switch (normalized) {
    case "pending":
      return "En attente";
    case "quoted":
      return "Devis envoyé";
    case "approved":
      return "Approuvée";
    case "rejected":
      return "Refusée";
    default:
      return "Inconnu";
  }
}

function getStatusPriority(status: unknown) {
  const normalized = normalizeStatus(status);

  if (normalized === "pending") return 0;
  if (normalized === "quoted") return 1;
  if (normalized === "approved") return 2;
  if (normalized === "rejected") return 3;

  return 4;
}

function getVehicleLabel(booking: LongTermBooking): string {
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

function formatPrice(value?: number | null) {
  if (value === undefined || value === null) return "Non renseigné";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

  return formatDate(date);
}

function getQuoteBadgeClass(booking: LongTermBooking) {
  if (booking.isQuoteSent) return "payment-chip payment-chip--full";
  if (booking.proposedMonthlyPrice || booking.proposedTotalPrice) {
    return "payment-chip payment-chip--deposit";
  }
  return "payment-chip payment-chip--pending";
}

function getQuoteLabel(booking: LongTermBooking) {
  if (booking.isQuoteSent) return "Envoyé";
  if (booking.proposedMonthlyPrice || booking.proposedTotalPrice) return "Préparé";
  return "Non envoyé";
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

const IconInfo = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default function LongTermBookingsPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<LongTermBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [activeTab, setActiveTab] = useState<ViewTab>("pending");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const response = await adminFetch("/long-term-rentals");
      const data = await response.json().catch(() => []);

      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des demandes longue durée.");
    } finally {
      setLoading(false);
    }
  }

  async function updateBookingStatus(id: string, status: "Approved" | "Rejected") {
    try {
      setActionLoadingId(id);
      setActionError("");

      const response = await adminFetch(`/long-term-rentals/${id}/status`, {
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

      const updatedBooking: LongTermBooking = data;

      setBookings((prev) =>
        prev.map((booking) => (booking.id === id ? updatedBooking : booking))
      );
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function deleteRequest(id: string) {
    const confirmed = window.confirm(
      "Tu veux vraiment supprimer cette demande longue durée ?"
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(id);
      setActionError("");

      const response = await adminFetch(`/long-term-rentals/${id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la suppression.");
      }

      setBookings((prev) => prev.filter((booking) => booking.id !== id));
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const stats = useMemo(() => {
    const totalMonthly = bookings.reduce(
      (sum, b) => sum + (b.proposedMonthlyPrice ?? 0),
      0
    );

    const totalGlobal = bookings.reduce(
      (sum, b) => sum + (b.proposedTotalPrice ?? 0),
      0
    );

    return {
      total: bookings.length,
      pending: bookings.filter((b) => normalizeStatus(b.status) === "pending").length,
      quoted: bookings.filter((b) => normalizeStatus(b.status) === "quoted").length,
      approved: bookings.filter((b) => normalizeStatus(b.status) === "approved").length,
      rejected: bookings.filter((b) => normalizeStatus(b.status) === "rejected").length,
      quoteSent: bookings.filter((b) => b.isQuoteSent).length,
      withVehicle: bookings.filter((b) => !!b.vehicleId).length,
      totalMonthly,
      totalGlobal,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = bookings.filter((booking) => {
      const normalizedStatus = normalizeStatus(booking.status);

      const matchesStatus =
        statusFilter === "all" ? true : normalizedStatus === statusFilter;

      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "pending"
          ? normalizedStatus === "pending"
          : activeTab === "quoted"
          ? normalizedStatus === "quoted"
          : normalizedStatus === "approved";

      const fullName =
        `${booking.firstName ?? ""} ${booking.lastName ?? ""}`.toLowerCase();
      const email = (booking.email ?? "").toLowerCase();
      const phone = (booking.phone ?? "").toLowerCase();
      const vehicle = getVehicleLabel(booking).toLowerCase();
      const pickupCity = (booking.pickupCity?.name ?? "").toLowerCase();
      const notes = (booking.notes ?? "").toLowerCase();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        vehicle.includes(query) ||
        pickupCity.includes(query) ||
        notes.includes(query);

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
        return (b.proposedTotalPrice ?? 0) - (a.proposedTotalPrice ?? 0);
      }

      return 0;
    });
  }, [bookings, search, statusFilter, sortBy, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      pending: bookings.filter((b) => normalizeStatus(b.status) === "pending").length,
      quoted: bookings.filter((b) => normalizeStatus(b.status) === "quoted").length,
      approved: bookings.filter((b) => normalizeStatus(b.status) === "approved").length,
      all: bookings.length,
    };
  }, [bookings]);

  return (
    <div className="bookings-page-v2 longterm-page">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion admin</span>
          <h1>Réservations longue durée</h1>
          <p>
            Une vue claire pour suivre les demandes longue durée, ouvrir une page
            détail complète et traiter rapidement chaque dossier.
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

        <article className="stat-card">
          <span>Devisés</span>
          <strong>{stats.quoted}</strong>
        </article>

        <article className="stat-card stat-card--success">
          <span>Approuvées</span>
          <strong>{stats.approved}</strong>
        </article>

        <article className="stat-card stat-card--danger">
          <span>Refusées</span>
          <strong>{stats.rejected}</strong>
        </article>

        <article className="stat-card">
          <span>Devis envoyés</span>
          <strong>{stats.quoteSent}</strong>
        </article>

        <article className="stat-card">
          <span>Avec véhicule choisi</span>
          <strong>{stats.withVehicle}</strong>
        </article>

        <article className="stat-card">
          <span>Total mensuel proposé</span>
          <strong>{formatPrice(stats.totalMonthly)}</strong>
        </article>

        <article className="stat-card stat-card--wide">
          <span>Total global proposé</span>
          <strong>{formatPrice(stats.totalGlobal)}</strong>
        </article>
      </section>

      <section className="bookings-tabs">
        <button
          type="button"
          className={activeTab === "pending" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("pending")}
        >
          En attente <span>{tabCounts.pending}</span>
        </button>

        <button
          type="button"
          className={activeTab === "quoted" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("quoted")}
        >
          Devisés <span>{tabCounts.quoted}</span>
        </button>

        <button
          type="button"
          className={activeTab === "approved" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("approved")}
        >
          Approuvées <span>{tabCounts.approved}</span>
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
            <option value="quoted">Devis envoyé</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Refusées</option>
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
              setActiveTab("pending");
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
          <h3>Aucune demande trouvée</h3>
          <p>Essaie de modifier les filtres ou la recherche.</p>
        </section>
      ) : (
        <section className="longterm-cards">
          {filteredBookings.map((booking) => {
            const normalizedStatus = normalizeStatus(booking.status);

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
                      <span>Début : {formatDate(booking.startDate)}</span>
                    </div>
                    <div className="meta-item">
                      <IconClock />
                      <span>Durée : {booking.durationMonths ?? 0} mois</span>
                    </div>
                    <div className="meta-item">
                      <IconMapPin />
                      <span>Ville : {booking.pickupCity?.name || "—"}</span>
                    </div>
                    <div className="meta-item">
                      <IconPhone />
                      <span>Téléphone : {booking.phone || "—"}</span>
                    </div>
                    <div className="meta-item meta-item--wide">
                      <IconMail />
                      <span>Email : {booking.email || "—"}</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="longterm-card__notes-preview">
                      <IconInfo />
                      <span>{booking.notes}</span>
                    </div>
                  )}
                </div>

                <div className="longterm-card__pricing">
                  <div className="longterm-price-box">
                    <small>Mensuel</small>
                    <strong>{formatPrice(booking.proposedMonthlyPrice)}</strong>
                  </div>

                  <div className="longterm-price-box">
                    <small>Total</small>
                    <strong>{formatPrice(booking.proposedTotalPrice)}</strong>
                  </div>

                  <div className="longterm-price-box">
                    <small>Devis</small>
                    <strong className={getQuoteBadgeClass(booking)}>
                      {getQuoteLabel(booking)}
                    </strong>
                  </div>
                </div>

                <div className="longterm-card__actions">
                  <button
                    type="button"
                    className="btn-neutral"
                    onClick={() => navigate(`/admin/long-term-bookings/${booking.id}`)}
                  >
                    Voir détail
                  </button>

                  {normalizedStatus !== "approved" && (
                    <button
                      type="button"
                      className="btn-confirm"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => updateBookingStatus(booking.id, "Approved")}
                    >
                      {actionLoadingId === booking.id ? "..." : "Approuver"}
                    </button>
                  )}

                  {normalizedStatus !== "rejected" && (
                    <button
                      type="button"
                      className="btn-cancel"
                      disabled={actionLoadingId === booking.id}
                      onClick={() => updateBookingStatus(booking.id, "Rejected")}
                    >
                      {actionLoadingId === booking.id ? "..." : "Refuser"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-neutral"
                    disabled={actionLoadingId === booking.id}
                    onClick={() => deleteRequest(booking.id)}
                  >
                    {actionLoadingId === booking.id ? "..." : "Supprimer"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}