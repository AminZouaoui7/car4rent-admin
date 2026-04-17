import { useEffect, useState, useMemo } from "react";
import ConfirmModal from "../components/ConfirmModal";
import Alert from "../components/Alert";
import { getAdminAccessToken } from "../services/authService";
import "../styles/transfers-page.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5167/api";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type City = {
  id: string;
  name: string;
  type: string;
};

type TransferBooking = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  hotelName: string;
  hotelAddress?: string;
  transferDate: string;
  luggageCount: number;
  passengers: number;
  status: TransferStatus;
  createdAt: string;
  pickupAirport?: City | null;
  dropoffCity?: City | null;
};

// ✅ Remplacer par
const TransferStatus = {
  Pending: 1,
  Confirmed: 2,
  Cancelled: 3,
} as const;

type TransferStatus = (typeof TransferStatus)[keyof typeof TransferStatus];

/* ─── Helpers ───────────────────────────────────────────────────────────── */

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<TransferStatus, string> = {
  [TransferStatus.Pending]: "En attente",
  [TransferStatus.Confirmed]: "Confirmé",
  [TransferStatus.Cancelled]: "Annulé",
};

const STATUS_PILL: Record<TransferStatus, string> = {
  [TransferStatus.Pending]: "transfers-pill--warning",
  [TransferStatus.Confirmed]: "transfers-pill--success",
  [TransferStatus.Cancelled]: "transfers-pill--danger",
};

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function TransfersPage() {
  const token = getAdminAccessToken();

  const [transfers, setTransfers] = useState<TransferBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const [selected, setSelected] = useState<TransferBooking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [newStatus, setNewStatus] = useState<TransferStatus>(TransferStatus.Pending);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState("");
  const [statusError, setStatusError] = useState("");

  const [cancelTarget, setCancelTarget] = useState<TransferBooking | null>(null);

  /* ── Auth headers ── */
  function getAuthHeaders(includeJson = false): HeadersInit {
    const headers: HeadersInit = {};
    if (includeJson) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  /* ── Fetch list ── */
  async function fetchTransfers() {
    try {
      setLoading(true);
      setPageError("");

      if (!token) {
        setPageError("Session admin introuvable. Merci de te reconnecter.");
        return;
      }

      const res = await fetch(`${API}/transfer-bookings`, {
        headers: getAuthHeaders(),
      });

      const data = await parseJsonSafe<TransferBooking[] | { message?: string }>(res);

      if (!res.ok) {
        setPageError(
          (!Array.isArray(data) && data?.message) || "Impossible de charger les transferts."
        );
        return;
      }

      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setPageError("Erreur réseau lors du chargement des transferts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTransfers();
  }, []);

  /* ── Open detail modal ── */
  async function openDetail(transfer: TransferBooking) {
    setDetailError("");
    setStatusSuccess("");
    setStatusError("");
    setDetailLoading(true);
    setSelected(transfer);
    setNewStatus(transfer.status);

    try {
      const res = await fetch(`${API}/transfer-bookings/${transfer.id}`, {
        headers: getAuthHeaders(),
      });

      const data = await parseJsonSafe<TransferBooking & { message?: string }>(res);

      if (!res.ok) {
        setDetailError(data?.message || "Impossible de charger les détails.");
        return;
      }

      if (data && "id" in data) {
        setSelected(data as TransferBooking);
        setNewStatus((data as TransferBooking).status);
      }
    } catch (err) {
      console.error(err);
      setDetailError("Erreur réseau.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelected(null);
    setDetailError("");
    setStatusSuccess("");
    setStatusError("");
  }

  /* ── Update status ── */
  async function handleUpdateStatus() {
    if (!selected) return;

    setStatusError("");
    setStatusSuccess("");

    try {
      setStatusSaving(true);

      const res = await fetch(`${API}/transfer-bookings/${selected.id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await parseJsonSafe<{ message?: string }>(res);

      if (!res.ok) {
        setStatusError(data?.message || "Erreur lors de la mise à jour du statut.");
        return;
      }

      setStatusSuccess("Statut mis à jour avec succès.");
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setTransfers((prev) =>
        prev.map((t) => (t.id === selected.id ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error(err);
      setStatusError("Erreur réseau lors de la mise à jour.");
    } finally {
      setStatusSaving(false);
    }
  }

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((t) => {
      const matchesSearch =
        !q ||
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.hotelName.toLowerCase().includes(q) ||
        t.pickupAirport?.name.toLowerCase().includes(q) ||
        t.dropoffCity?.name.toLowerCase().includes(q);

      const matchesStatus =
        filterStatus === "" || String(t.status) === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [transfers, search, filterStatus]);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total: transfers.length,
    pending: transfers.filter((t) => t.status === TransferStatus.Pending).length,
    confirmed: transfers.filter((t) => t.status === TransferStatus.Confirmed).length,
  }), [transfers]);

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="bookings-page-v2 transfers-page">

      {/* ── Hero ── */}
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion admin</span>
          <h1>Transferts aéroport</h1>
          <p>
            Consultez et gérez toutes les demandes de transfert aéroport → hôtel
            soumises par les clients.
          </p>
        </div>

        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="transfers-stats">
        <article className="transfers-stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>

        <article className="transfers-stat-card transfers-stat-card--warning">
          <span>En attente</span>
          <strong>{stats.pending}</strong>
        </article>

        <article className="transfers-stat-card transfers-stat-card--success">
          <span>Confirmés</span>
          <strong>{stats.confirmed}</strong>
        </article>

        
      </section>

      {/* ── Page error ── */}
      {pageError && <Alert kind="error">{pageError}</Alert>}

      {/* ── Filters ── */}
      <div className="transfers-filters-card">
        <div className="transfers-input-wrap transfers-input-wrap--grow">
          <label>Rechercher</label>
          <input
            type="text"
            placeholder="Nom, email, téléphone, hôtel, aéroport..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="transfers-input-wrap">
          <label>Statut</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous</option>
            <option value="0">En attente</option>
            <option value="1">Confirmé</option>
            <option value="2">Annulé</option>
            <option value="3">Terminé</option>
          </select>
        </div>
      </div>

      {/* ── List ── */}
      <div className="transfers-list-card">
        {loading ? (
          <div className="transfers-empty-state">Chargement des transferts...</div>
        ) : filtered.length === 0 ? (
          <div className="transfers-empty-state">
            {transfers.length === 0
              ? "Aucune demande de transfert pour le moment."
              : "Aucun résultat pour cette recherche."}
          </div>
        ) : (
          <div className="transfers-list">
            {filtered.map((transfer) => (
              <div className="transfers-list-item" key={transfer.id}>

                {/* Left — Client info */}
                <div className="transfers-item__client">
                  <div className="transfers-item__avatar">
                    {transfer.firstName[0]}{transfer.lastName[0]}
                  </div>
                  <div>
                    <p className="transfers-item__name">
                      {transfer.firstName} {transfer.lastName}
                    </p>
                    <p className="transfers-item__sub">{transfer.email}</p>
                    <p className="transfers-item__sub">{transfer.phone}</p>
                  </div>
                </div>

                {/* Middle — Route info */}
                <div className="transfers-item__route">
                  <div className="transfers-route-pill">
                    <span className="transfers-route-label">✈</span>
                    <span>{transfer.pickupAirport?.name ?? "—"}</span>
                  </div>
                  <span className="transfers-route-arrow">→</span>
                  <div className="transfers-route-pill transfers-route-pill--dest">
                    <span className="transfers-route-label">⌂</span>
                    <span>{transfer.dropoffCity?.name ?? "—"}</span>
                  </div>
                </div>

                {/* Meta */}
                <div className="transfers-item__meta">
                  <p>
                    <span className="transfers-meta-label">Date</span>
                    {formatDate(transfer.transferDate)}
                  </p>
                  <p>
                    <span className="transfers-meta-label">Hôtel</span>
                    {transfer.hotelName}
                  </p>
                  <p>
                    <span className="transfers-meta-label">Passagers</span>
                    {transfer.passengers} · {transfer.luggageCount} bagage{transfer.luggageCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Right — Status + actions */}
                <div className="transfers-item__right">
                  <span className={`transfers-pill ${STATUS_PILL[transfer.status]}`}>
                    {STATUS_LABELS[transfer.status]}
                  </span>

                  <div className="transfers-row-actions">
                    <button
                      type="button"
                      className="transfers-action-btn"
                      onClick={() => void openDetail(transfer)}
                    >
                      Détails
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="transfers-modal-overlay" onClick={closeDetail}>
          <div className="transfers-modal" onClick={(e) => e.stopPropagation()}>

            <div className="transfers-modal__header">
              <div>
                <p className="transfers-modal__badge">Transfert #{selected.id.slice(0, 8).toUpperCase()}</p>
                <h3>
                  {selected.firstName} {selected.lastName}
                </h3>
              </div>
              <button className="transfers-modal__close" type="button" onClick={closeDetail}>
                ×
              </button>
            </div>

            <div className="transfers-modal__body">
              {detailLoading ? (
                <div className="transfers-empty-state">Chargement...</div>
              ) : (
                <>
                  {detailError && <Alert kind="error">{detailError}</Alert>}

                  {/* Route */}
                  <div className="transfers-detail-section">
                    <p className="transfers-detail-section__title">Itinéraire</p>

                    <div className="transfers-detail-route">
                      <div className="transfers-detail-route__stop">
                        <span className="transfers-detail-route__icon">✈</span>
                        <div>
                          <p className="transfers-detail-route__label">Aéroport de prise en charge</p>
                          <p className="transfers-detail-route__value">
                            {selected.pickupAirport?.name ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="transfers-detail-route__line" />

                      <div className="transfers-detail-route__stop">
                        <span className="transfers-detail-route__icon">⌂</span>
                        <div>
                          <p className="transfers-detail-route__label">Ville de destination</p>
                          <p className="transfers-detail-route__value">
                            {selected.dropoffCity?.name ?? "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client */}
                  <div className="transfers-detail-section">
                    <p className="transfers-detail-section__title">Client</p>
                    <div className="transfers-detail-grid">
                      <div className="transfers-detail-item">
                        <span>Nom complet</span>
                        <strong>{selected.firstName} {selected.lastName}</strong>
                      </div>
                      <div className="transfers-detail-item">
                        <span>Email</span>
                        <strong>{selected.email}</strong>
                      </div>
                      <div className="transfers-detail-item">
                        <span>Téléphone</span>
                        <strong>{selected.phone}</strong>
                      </div>
                      <div className="transfers-detail-item">
                        <span>Demande créée le</span>
                        <strong>{formatDateTime(selected.createdAt)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Séjour */}
                  <div className="transfers-detail-section">
                    <p className="transfers-detail-section__title">Séjour & logistique</p>
                    <div className="transfers-detail-grid">
                      <div className="transfers-detail-item">
                        <span>Date de transfert</span>
                        <strong>{formatDate(selected.transferDate)}</strong>
                      </div>
                      <div className="transfers-detail-item">
                        <span>Passagers</span>
                        <strong>{selected.passengers}</strong>
                      </div>
                      <div className="transfers-detail-item">
                        <span>Bagages</span>
                        <strong>{selected.luggageCount}</strong>
                      </div>
                      <div className="transfers-detail-item">
                        <span>Hôtel</span>
                        <strong>{selected.hotelName}</strong>
                      </div>
                      {selected.hotelAddress && (
                        <div className="transfers-detail-item transfers-detail-item--full">
                          <span>Adresse hôtel</span>
                          <strong>{selected.hotelAddress}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status update */}
                  <div className="transfers-detail-section">
                    <p className="transfers-detail-section__title">Mise à jour du statut</p>

                    <div className="transfers-status-row">
                      <div className="transfers-input-wrap transfers-input-wrap--grow">
                        <label>Nouveau statut</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(Number(e.target.value) as TransferStatus)}
                        >
                          <option value={TransferStatus.Pending}>En attente</option>
                          <option value={TransferStatus.Confirmed}>Confirmé</option>
                          <option value={TransferStatus.Cancelled}>Annulé</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        className="transfers-primary-btn"
                        onClick={() => void handleUpdateStatus()}
                        disabled={statusSaving || newStatus === selected.status}
                      >
                        {statusSaving ? "Sauvegarde..." : "Mettre à jour"}
                      </button>
                    </div>

                    {statusError && <Alert kind="error">{statusError}</Alert>}
                    {statusSuccess && <Alert kind="success">{statusSuccess}</Alert>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!cancelTarget}
        title="Confirmer l'annulation"
        message={
          cancelTarget
            ? `Annuler le transfert de ${cancelTarget.firstName} ${cancelTarget.lastName} ?`
            : ""
        }
        confirmLabel="Annuler le transfert"
        cancelLabel="Retour"
        onConfirm={() => {
          if (cancelTarget) {
            setNewStatus(TransferStatus.Cancelled);
            void handleUpdateStatus();
          }
          setCancelTarget(null);
        }}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}