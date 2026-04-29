import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

type QuoteFormState = {
  proposedMonthlyPrice: string;
  proposedTotalPrice: string;
  isQuoteSent: boolean;
};

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

function formatDateTime(date?: string) {
  if (!date) return "Non renseignée";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Non renseignée";

  return parsed.toLocaleString("fr-FR");
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

function addMonthsToDate(date?: string, months?: number) {
  if (!date || !months) return "Non renseignée";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Non renseignée";

  const next = new Date(parsed);
  next.setMonth(next.getMonth() + months);

  return next.toLocaleDateString("fr-FR");
}

export default function LongTermBookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<LongTermBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [quoteForm, setQuoteForm] = useState<QuoteFormState>({
    proposedMonthlyPrice: "",
    proposedTotalPrice: "",
    isQuoteSent: false,
  });

  useEffect(() => {
    loadBooking();
  }, [id]);

  useEffect(() => {
    if (!booking) return;

    setQuoteForm({
      proposedMonthlyPrice:
        booking.proposedMonthlyPrice !== undefined &&
        booking.proposedMonthlyPrice !== null
          ? String(booking.proposedMonthlyPrice)
          : "",
      proposedTotalPrice:
        booking.proposedTotalPrice !== undefined &&
        booking.proposedTotalPrice !== null
          ? String(booking.proposedTotalPrice)
          : "",
      isQuoteSent: !!booking.isQuoteSent,
    });
  }, [booking]);

  async function loadBooking() {
    if (!id) {
      setError("Identifiant introuvable.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const listResponse = await adminFetch("/long-term-rentals");
      const listData = await listResponse.json().catch(() => []);

      if (!listResponse.ok || !Array.isArray(listData)) {
        throw new Error("Impossible de charger la réservation.");
      }

      const found = listData.find((item: LongTermBooking) => item.id === id);

      if (!found) {
        throw new Error("Réservation longue durée introuvable.");
      }

      setBooking(found);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du détail.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: "Approved" | "Rejected") {
    if (!booking) return;

    try {
      setActionLoading(true);
      setActionError("");

      const response = await adminFetch(`/long-term-rentals/${booking.id}/status`, {
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

      setBooking(data);
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveQuote() {
    if (!booking) return;

    try {
      setActionLoading(true);
      setActionError("");

      const payload = {
        proposedMonthlyPrice:
          quoteForm.proposedMonthlyPrice.trim() === ""
            ? null
            : Number(quoteForm.proposedMonthlyPrice),
        proposedTotalPrice:
          quoteForm.proposedTotalPrice.trim() === ""
            ? null
            : Number(quoteForm.proposedTotalPrice),
        isQuoteSent: quoteForm.isQuoteSent,
      };

      const response = await adminFetch(`/long-term-rentals/${booking.id}/quote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la mise à jour du devis.");
      }

      setBooking(data);
    } catch (err: any) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setActionLoading(false);
    }
  }

  const normalizedStatus = useMemo(
    () => normalizeStatus(booking?.status),
    [booking]
  );

  if (loading) {
    return (
      <div className="bookings-page-v2">
        <section className="bookings-empty">
          <h3>Chargement...</h3>
          <p>Récupération du détail de la réservation longue durée.</p>
        </section>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bookings-page-v2">
        <section className="bookings-empty">
          <h3>Erreur</h3>
          <p>{error || "Réservation introuvable."}</p>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn-neutral"
              onClick={() => navigate("/admin/long-term-bookings")}
            >
              Retour à la liste
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bookings-page-v2">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Détail longue durée</span>
          <h1>
            {booking.firstName} {booking.lastName}
          </h1>
          <p>
            Fiche détaillée de la demande longue durée avec client, véhicule, devis
            et actions admin.
          </p>
        </div>

        <div className="bookings-header-right" style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="btn-neutral"
            onClick={() => navigate("/admin/long-term-bookings")}
          >
            Retour
          </button>

          <span className={`status-chip status-chip--${normalizedStatus}`}>
            {getStatusLabel(booking.status)}
          </span>
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

      <section className="longterm-detail-grid">
        <div className="longterm-detail-left">
          <article className="booking-detail-card longterm-hero-card">
            <div className="longterm-hero-card__image">
              <img
                src={
                  booking.vehicle?.image ||
                  "https://via.placeholder.com/900x420/f3f7fb/9aa9bb?text=Car4Rent"
                }
                alt={getVehicleLabel(booking)}
              />
            </div>

            <div className="longterm-hero-card__body">
              <div>
                <span className="bookings-kicker">Véhicule demandé</span>
                <h3>{getVehicleLabel(booking)}</h3>
                <p>{booking.vehicle?.category?.name || "Catégorie non renseignée"}</p>
              </div>

              <div className="longterm-hero-card__chips">
                <span className="longterm-info-chip">
                  Début : {formatDate(booking.startDate)}
                </span>
                <span className="longterm-info-chip">
                  Durée : {booking.durationMonths ?? 0} mois
                </span>
                <span className="longterm-info-chip">
                  Fin estimée : {addMonthsToDate(booking.startDate, booking.durationMonths)}
                </span>
              </div>
            </div>
          </article>

          <article className="booking-detail-card">
            <h4>Informations client</h4>

            <div className="booking-detail-item">
              <span>Nom complet</span>
              <strong>
                {booking.firstName} {booking.lastName}
              </strong>
            </div>

            <div className="booking-detail-item">
              <span>Email</span>
              <strong>{booking.email || "Non renseigné"}</strong>
            </div>

            <div className="booking-detail-item">
              <span>Téléphone</span>
              <strong>{booking.phone || "Non renseigné"}</strong>
            </div>

            <div className="booking-detail-item">
              <span>Ville de départ</span>
              <strong>{booking.pickupCity?.name || "Non renseignée"}</strong>
            </div>

            <div className="booking-detail-item">
              <span>Créée le</span>
              <strong>{formatDateTime(booking.createdAt)}</strong>
            </div>
          </article>

          <article className="booking-detail-card">
            <h4>Remarque du client</h4>
            <div className="longterm-note-box">
              {booking.notes?.trim() || "Aucune remarque laissée par le client."}
            </div>
          </article>
        </div>

        <div className="longterm-detail-right">
          <article className="booking-detail-card booking-detail-card--payment">
            <h4>Résumé devis</h4>

            <div className="booking-detail-item">
              <span>Prix mensuel</span>
              <strong>{formatPrice(booking.proposedMonthlyPrice)}</strong>
            </div>

            <div className="booking-detail-item">
              <span>Prix total</span>
              <strong>{formatPrice(booking.proposedTotalPrice)}</strong>
            </div>

            <div className="booking-detail-item">
              <span>Statut devis</span>
              <strong className={getQuoteBadgeClass(booking)}>
                {getQuoteLabel(booking)}
              </strong>
            </div>
          </article>

          <article className="booking-detail-card">
            <h4>Modifier le devis</h4>

            <div className="longterm-form-grid">
              <input
                type="number"
                min="0"
                step="0.01"
                value={quoteForm.proposedMonthlyPrice}
                onChange={(e) =>
                  setQuoteForm((prev) => ({
                    ...prev,
                    proposedMonthlyPrice: e.target.value,
                  }))
                }
                placeholder="Prix mensuel"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={quoteForm.proposedTotalPrice}
                onChange={(e) =>
                  setQuoteForm((prev) => ({
                    ...prev,
                    proposedTotalPrice: e.target.value,
                  }))
                }
                placeholder="Prix total"
              />

              <label className="longterm-checkbox">
                <input
                  type="checkbox"
                  checked={quoteForm.isQuoteSent}
                  onChange={(e) =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      isQuoteSent: e.target.checked,
                    }))
                  }
                />
                Marquer le devis comme envoyé
              </label>

              <button
                type="button"
                className="btn-neutral"
                onClick={saveQuote}
                disabled={actionLoading}
              >
                {actionLoading ? "Enregistrement..." : "Enregistrer le devis"}
              </button>
            </div>
          </article>

          <article className="booking-detail-card">
            <h4>Actions</h4>

            <div className="longterm-actions-stack">
              <button
                type="button"
                className="btn-confirm"
                disabled={actionLoading || normalizedStatus === "approved"}
                onClick={() => updateStatus("Approved")}
              >
                {actionLoading ? "Traitement..." : "Approuver"}
              </button>

              <button
                type="button"
                className="btn-cancel"
                disabled={actionLoading || normalizedStatus === "rejected"}
                onClick={() => updateStatus("Rejected")}
              >
                {actionLoading ? "Traitement..." : "Refuser"}
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
