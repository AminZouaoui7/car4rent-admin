import { useEffect, useMemo, useState } from "react";
import { getAdminToken } from "../services/authService";
import ConfirmModal from "../components/ConfirmModal";
import Alert from "../components/Alert";
import "../styles/promo-codes-page.css";

type PromoCode = {
  id: string;
  code: string;
  discountPercentage: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  maxUses?: number | null;
  usedCount: number;
  createdAt?: string;
  updatedAt?: string;
};

type PromoForm = {
  code: string;
  discountPercentage: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  maxUses: string;
};

type PromoApiResponse = {
  message?: string;
  promoCode?: PromoCode;
  error?: string;
  innerError?: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5167/api";

const emptyForm: PromoForm = {
  code: "",
  discountPercentage: "",
  isActive: true,
  startDate: "",
  endDate: "",
  maxUses: "",
};

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<PromoCode | null>(null);

  const [form, setForm] = useState<PromoForm>(emptyForm);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = getAdminToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const parseApiResponse = async (res: Response) => {
    const rawText = await res.text();

    try {
      return rawText ? JSON.parse(rawText) : null;
    } catch {
      return rawText;
    }
  };

  const extractErrorMessage = (data: unknown, fallback: string) => {
    if (typeof data === "string" && data.trim()) return data;

    if (data && typeof data === "object") {
      const apiData = data as PromoApiResponse;
      return (
        apiData.innerError ||
        apiData.error ||
        apiData.message ||
        fallback
      );
    }

    return fallback;
  };

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE}/promo-codes`, {
        headers: getAuthHeaders(),
      });

      const data = await parseApiResponse(res);

      if (res.status === 401) {
        throw new Error("Session expirée ou non autorisée. Reconnecte-toi en admin.");
      }

      if (!res.ok) {
        throw new Error(extractErrorMessage(data, "Impossible de charger les codes promo."));
      }

      setPromoCodes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des codes promo.");
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("fr-FR");
  };

  const toDateInputValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const filteredPromoCodes = useMemo(() => {
    return promoCodes.filter((promo) => {
      const matchesSearch = promo.code
        .toLowerCase()
        .includes(search.toLowerCase().trim());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && promo.isActive) ||
        (statusFilter === "inactive" && !promo.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [promoCodes, search, statusFilter]);

  const stats = useMemo(() => {
    const total = promoCodes.length;
    const active = promoCodes.filter((p) => p.isActive).length;
    const inactive = promoCodes.filter((p) => !p.isActive).length;
    const totalUses = promoCodes.reduce((sum, p) => sum + (p.usedCount || 0), 0);

    return { total, active, inactive, totalUses };
  }, [promoCodes]);

  const openCreateModal = () => {
    resetMessages();
    setEditingPromo(null);
    setForm(emptyForm);
    setShowFormModal(true);
  };

  const openEditModal = (promo: PromoCode) => {
    resetMessages();
    setEditingPromo(promo);
    setForm({
      code: promo.code || "",
      discountPercentage:
        promo.discountPercentage !== null && promo.discountPercentage !== undefined
          ? String(promo.discountPercentage)
          : "",
      isActive: promo.isActive,
      startDate: toDateInputValue(promo.startDate),
      endDate: toDateInputValue(promo.endDate),
      maxUses:
        promo.maxUses !== null && promo.maxUses !== undefined
          ? String(promo.maxUses)
          : "",
    });
    setShowFormModal(true);
  };

  const openDeleteModal = (promo: PromoCode) => {
    resetMessages();
    setPromoToDelete(promo);
    setShowDeleteModal(true);
  };

  const closeFormModal = () => {
    if (submitting) return;
    setShowFormModal(false);
    setEditingPromo(null);
    setForm(emptyForm);
  };

  const closeDeleteModal = () => {
    if (submitting) return;
    setShowDeleteModal(false);
    setPromoToDelete(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!form.code.trim()) {
      setError("Le code promo est obligatoire.");
      return false;
    }

    const percentage = Number(form.discountPercentage);
    if (!form.discountPercentage || Number.isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setError("Le pourcentage de réduction doit être entre 1 et 100.");
      return false;
    }

    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError("La date de début doit être antérieure à la date de fin.");
      return false;
    }

    if (form.maxUses.trim() !== "") {
      const maxUses = Number(form.maxUses);
      if (Number.isNaN(maxUses) || maxUses <= 0) {
        setError("Le nombre maximum d'utilisations doit être supérieur à 0.");
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    return {
      code: form.code.trim().toUpperCase(),
      discountPercentage: Number(form.discountPercentage),
      isActive: form.isActive,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      maxUses: form.maxUses.trim() === "" ? null : Number(form.maxUses),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = buildPayload();

      const isEdit = !!editingPromo;
      const url = isEdit
        ? `${API_BASE}/promo-codes/${editingPromo.id}`
        : `${API_BASE}/promo-codes`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await parseApiResponse(res);
      console.log("PromoCodes API response:", data);

      if (res.status === 401) {
        throw new Error("Session expirée ou non autorisée. Reconnecte-toi en admin.");
      }

      if (!res.ok) {
        throw new Error(extractErrorMessage(data, "Une erreur est survenue."));
      }

      if (isEdit) {
        const updatedPromo: PromoCode =
          data && typeof data === "object" && "promoCode" in data && data.promoCode
            ? (data.promoCode as PromoCode)
            : {
                ...editingPromo,
                ...payload,
                startDate: payload.startDate,
                endDate: payload.endDate,
                maxUses: payload.maxUses,
              };

        setPromoCodes((prev) =>
          prev.map((promo) => (promo.id === editingPromo.id ? updatedPromo : promo))
        );

        setSuccess("Le code promo a été mis à jour avec succès.");
      } else {
        const createdPromo =
          data && typeof data === "object" && "promoCode" in data
            ? (data.promoCode as PromoCode | undefined)
            : undefined;

        if (createdPromo) {
          setPromoCodes((prev) => [createdPromo, ...prev]);
        }

        setSuccess("Le code promo a été créé avec succès.");
      }

      closeFormModal();
    } catch (err: any) {
      setError(err.message || "Impossible d'enregistrer ce code promo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!promoToDelete) return;

    resetMessages();

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/promo-codes/${promoToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await parseApiResponse(res);

      if (res.status === 401) {
        throw new Error("Session expirée ou non autorisée. Reconnecte-toi en admin.");
      }

      if (!res.ok) {
        throw new Error(extractErrorMessage(data, "Impossible de supprimer ce code promo."));
      }

      setPromoCodes((prev) => prev.filter((promo) => promo.id !== promoToDelete.id));
      setSuccess("Le code promo a été supprimé avec succès.");
      closeDeleteModal();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bookings-page-v2 promo-page">
      <section className="bookings-header reveal-up">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion commerciale</span>
          <h1>Codes promo & réductions</h1>
          <p>
            Crée, modifie et pilote tes campagnes promotionnelles depuis
            l’interface admin avec une vue claire sur l’activité et l’utilisation.
          </p>
        </div>

        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>Codes enregistrés</span>
            <strong>{stats.total}</strong>
          </div>
        </div>
      </section>

      {(success || error) && <Alert kind={error ? "error" : "success"}>{error || success}</Alert>}

      <section className="promo-toolbar reveal-up delay-2">
        <div className="promo-search">
          <label>Recherche</label>
          <input
            type="text"
            placeholder="Rechercher un code promo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="promo-filter">
          <label>Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>

        <div className="promo-toolbar__actions">
          <button className="promo-primary-btn" onClick={openCreateModal}>
            + Ajouter un code promo
          </button>
        </div>
      </section>

      <section className="promo-table-card reveal-up delay-3">
        <div className="promo-table-head">
          <div>
            <h3>Liste des codes promo</h3>
            <p>{filteredPromoCodes.length} code(s) affiché(s)</p>
          </div>
        </div>

        {loading ? (
          <div className="promo-loading">
            <div className="promo-skeleton-row" />
            <div className="promo-skeleton-row" />
            <div className="promo-skeleton-row" />
            <div className="promo-skeleton-row" />
          </div>
        ) : filteredPromoCodes.length === 0 ? (
          <div className="promo-empty">
            Aucun code promo trouvé pour cette recherche.
          </div>
        ) : (
          <div className="promo-table-wrap">
            <table className="promo-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Réduction</th>
                  <th>Statut</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Max uses</th>
                  <th>Used count</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredPromoCodes.map((promo) => {
                  const isLimitReached =
                    promo.maxUses !== null &&
                    promo.maxUses !== undefined &&
                    promo.usedCount >= promo.maxUses;

                  return (
                    <tr key={promo.id}>
                      <td>
                        <div className="promo-code-cell">
                          <strong>{promo.code}</strong>
                          <span>ID: {promo.id.slice(0, 8)}...</span>
                        </div>
                      </td>

                      <td>
                        <span className="promo-discount-badge">
                          {promo.discountPercentage}%
                        </span>
                      </td>

                      <td>
                        <span
                          className={`promo-status-badge ${
                            promo.isActive
                              ? "promo-status-badge--active"
                              : "promo-status-badge--inactive"
                          }`}
                        >
                          {promo.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>

                      <td>{formatDate(promo.startDate)}</td>
                      <td>{formatDate(promo.endDate)}</td>
                      <td>{promo.maxUses ?? "Illimité"}</td>
                      <td>
                        <div className="promo-usage-cell">
                          <strong>{promo.usedCount}</strong>
                          {isLimitReached && (
                            <span className="promo-usage-limit">Limite atteinte</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="promo-actions">
                          <button
                            className="promo-action-btn promo-action-btn--edit"
                            onClick={() => openEditModal(promo)}
                          >
                            Modifier
                          </button>

                          <button
                            className="promo-action-btn promo-action-btn--delete"
                            onClick={() => openDeleteModal(promo)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showFormModal && (
        <div className="promo-modal-overlay" onClick={closeFormModal}>
          <div className="promo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="promo-modal-header">
              <div>
                <span className="promo-modal-kicker">
                  {editingPromo ? "Mise à jour" : "Nouveau code promo"}
                </span>
                <h3>
                  {editingPromo
                    ? "Modifier le code promo"
                    : "Créer un code promo"}
                </h3>
              </div>

              <button type="button" className="promo-modal-close" onClick={closeFormModal}>
                ×
              </button>
            </div>

            <form className="promo-form" onSubmit={handleSubmit}>
              <div className="promo-form-grid">
                <div className="promo-form-field">
                  <label>Code promo</label>
                  <input
                    type="text"
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="Ex: WELCOME10"
                  />
                </div>

                <div className="promo-form-field">
                  <label>Réduction (%)</label>
                  <input
                    type="number"
                    name="discountPercentage"
                    value={form.discountPercentage}
                    onChange={handleChange}
                    placeholder="Ex: 10"
                    min="1"
                    max="100"
                  />
                </div>

                <div className="promo-form-field">
                  <label>Date de début</label>
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="promo-form-field">
                  <label>Date de fin</label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="promo-form-field">
                  <label>Nombre max d’utilisations</label>
                  <input
                    type="number"
                    name="maxUses"
                    value={form.maxUses}
                    onChange={handleChange}
                    placeholder="Vide = illimité"
                    min="1"
                  />
                </div>

                <div className="promo-form-field promo-form-field--switch">
                  <label>Statut</label>
                  <label className="promo-switch">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />
                    <span>{form.isActive ? "Code actif" : "Code inactif"}</span>
                  </label>
                </div>
              </div>

              <div className="promo-modal-footer">
                <button
                  type="button"
                  className="promo-secondary-btn"
                  onClick={closeFormModal}
                  disabled={submitting}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="promo-primary-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "Enregistrement..."
                    : editingPromo
                    ? "Mettre à jour"
                    : "Créer le code promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={showDeleteModal && !!promoToDelete}
        title="Confirmer la suppression"
        message={
          promoToDelete
            ? `Supprimer le code "${promoToDelete.code}" ?`
            : ""
        }
        confirmLabel={submitting ? "Suppression..." : "Supprimer"}
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}
