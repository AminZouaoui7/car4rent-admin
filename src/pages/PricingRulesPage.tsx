import { useEffect, useMemo, useState } from "react";
import Alert from "../components/Alert";
import ConfirmModal from "../components/ConfirmModal";
import { adminFetch } from "../services/adminFetch";
import "../styles/management.css";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
};

type Category = {
  id: string;
  name: string;
};

type PricingRule = {
  id: string;
  vehicle?: Vehicle | null;
  category?: Category | null;
  vehicleId?: string | null;
  categoryId?: string | null;
  startDate: string;
  endDate: string;
  pricePerDay: number;
  label?: string | null;
  isActive: boolean;
};

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [toDelete, setToDelete] = useState<PricingRule | null>(null);

  const [form, setForm] = useState({
    vehicleId: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    pricePerDay: "",
    label: "",
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [rulesRes, vehiclesRes, categoriesRes] = await Promise.all([
        adminFetch("/pricing-rules"),
        adminFetch("/vehicles"),
        adminFetch("/categories"),
      ]);

      const rulesData = await rulesRes.json();
      const vehiclesData = await vehiclesRes.json();
      const categoriesData = await categoriesRes.json();

      setRules(rulesData || []);
      setVehicles(vehiclesData || []);
      setCategories(categoriesData || []);
    } catch (e: any) {
      setError(e?.message || "Erreur chargement.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return rules;

    return rules.filter((r) => {
      return (
        r.label?.toLowerCase().includes(q) ||
        r.vehicle?.model?.toLowerCase().includes(q) ||
        r.category?.name?.toLowerCase().includes(q)
      );
    });
  }, [rules, search]);

  function openCreate() {
    setForm({
      vehicleId: "",
      categoryId: "",
      startDate: "",
      endDate: "",
      pricePerDay: "",
      label: "",
      isActive: true,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.vehicleId && !form.categoryId) {
      setError("Choisir véhicule ou catégorie.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const res = await adminFetch("/pricing-rules", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: form.vehicleId || null,
          categoryId: form.categoryId || null,
          startDate: form.startDate,
          endDate: form.endDate,
          pricePerDay: Number(form.pricePerDay),
          label: form.label,
          isActive: form.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur création");
      }

      setSuccess("Règle créée avec succès 🔥");
      setShowForm(false);
      loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;

    try {
      const res = await adminFetch(`/pricing-rules/${toDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erreur suppression");

      setRules((prev) => prev.filter((r) => r.id !== toDelete.id));
      setSuccess("Supprimé ✅");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="bookings-page-v2 crud-page">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion pricing</span>
          <h1>Pricing Rules</h1>
          <p>Gérer les règles dynamiques de prix.</p>
        </div>

        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>Total</span>
            <strong>{rules.length}</strong>
          </div>
        </div>
      </section>

      {(error || success) && (
        <Alert kind={error ? "error" : "success"}>
          {error || success}
        </Alert>
      )}

      <section className="crud-toolbar">
        <input
          type="text"
          placeholder="Recherche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="crud-primary-btn" onClick={openCreate}>
          + Nouvelle règle
        </button>
      </section>

      <section className="crud-card">
        {loading ? (
          <div className="crud-empty">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="crud-empty">Aucune règle</div>
        ) : (
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Véhicule / Catégorie</th>
                  <th>Période</th>
                  <th>Prix</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label || "-"}</td>

                    <td>
                      {r.vehicle
                        ? `${r.vehicle.brand} ${r.vehicle.model}`
                        : r.category?.name}
                    </td>

                    <td>
                      {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}
                    </td>

                    <td>{r.pricePerDay} €</td>

                    <td>
                      <span className={r.isActive ? "badge-success" : "badge-error"}>
                        {r.isActive ? "Actif" : "Inactif"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="crud-action-btn crud-action-btn--delete"
                        onClick={() => setToDelete(r)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
  <div className="pricing-rule-modal-overlay" onClick={() => setShowForm(false)}>
    <div className="pricing-rule-modal" onClick={(e) => e.stopPropagation()}>
      <div className="pricing-rule-modal__header">
        <div>
          <span className="pricing-rule-modal__eyebrow">Gestion tarifaire</span>
          <h3>Nouvelle règle de prix</h3>
          <p>Crée une règle de prix par véhicule ou par catégorie sur une période donnée.</p>
        </div>

        <button
          type="button"
          className="pricing-rule-modal__close"
          onClick={() => setShowForm(false)}
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="pricing-rule-form">
        <div className="pricing-rule-form__grid">
          <div className="pricing-rule-field pricing-rule-field--full">
            <label htmlFor="pricing-rule-label">Label</label>
            <input
              id="pricing-rule-label"
              type="text"
              placeholder="Ex: Haute saison été"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          <div className="pricing-rule-field">
            <label htmlFor="pricing-rule-vehicle">Véhicule</label>
            <select
              id="pricing-rule-vehicle"
              value={form.vehicleId}
              onChange={(e) =>
                setForm({ ...form, vehicleId: e.target.value, categoryId: "" })
              }
            >
              <option value="">Choisir un véhicule</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>

          <div className="pricing-rule-field">
            <label htmlFor="pricing-rule-category">Catégorie</label>
            <select
              id="pricing-rule-category"
              value={form.categoryId}
              onChange={(e) =>
                setForm({ ...form, categoryId: e.target.value, vehicleId: "" })
              }
            >
              <option value="">Choisir une catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pricing-rule-field">
            <label htmlFor="pricing-rule-start-date">Date de début</label>
            <input
              id="pricing-rule-start-date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>

          <div className="pricing-rule-field">
            <label htmlFor="pricing-rule-end-date">Date de fin</label>
            <input
              id="pricing-rule-end-date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <div className="pricing-rule-field pricing-rule-field--full">
            <label htmlFor="pricing-rule-price">Prix par jour</label>
            <input
              id="pricing-rule-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex: 120"
              value={form.pricePerDay}
              onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })}
            />
          </div>

          <div className="pricing-rule-checkbox pricing-rule-field--full">
            <label htmlFor="pricing-rule-active">
              <input
                id="pricing-rule-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>Activer cette règle immédiatement</span>
            </label>
          </div>
        </div>

        <div className="pricing-rule-modal__footer">
          <button
            type="button"
            className="pricing-rule-secondary-btn"
            onClick={() => setShowForm(false)}
            disabled={submitting}
          >
            Annuler
          </button>

          <button
            type="submit"
            className="pricing-rule-primary-btn"
            disabled={submitting}
          >
            {submitting ? "Création..." : "Créer la règle"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      <ConfirmModal
        open={!!toDelete}
        title="Supprimer règle"
        message="Confirmer suppression ?"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}