import { useEffect, useMemo, useState } from "react";
import Alert from "../components/Alert";
import ConfirmModal from "../components/ConfirmModal";
import { adminFetch } from "../services/adminFetch";
import "../styles/management.css";

type Category = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

type CategoryForm = {
  name: string;
};

const emptyForm: CategoryForm = {
  name: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [toDelete, setToDelete] = useState<Category | null>(null);

  useEffect(() => {
    void loadCategories();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");
      const res = await adminFetch("/categories");
      const data = await res.json().catch(() => []);
      setCategories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les catégories.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setSuccess("");
    setError("");
  }

  function openEdit(item: Category) {
    setEditing(item);
    setForm({ name: item.name });
    setShowForm(true);
    setSuccess("");
    setError("");
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      if (editing) {
        const res = await adminFetch(`/categories/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: form.name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Échec de la mise à jour.");
        }
        setSuccess("Catégorie modifiée avec succès.");
      } else {
        const res = await adminFetch(`/categories`, {
          method: "POST",
          body: JSON.stringify({ name: form.name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Échec de la création.");
        }
        setSuccess("Catégorie créée avec succès.");
      }

      await loadCategories();
      closeForm();
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      setError("");
      setSuccess("");
      const res = await adminFetch(`/categories/${toDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Suppression impossible.");
      }
      setCategories((prev) => prev.filter((c) => c.id !== toDelete.id));
      setSuccess("Catégorie supprimée avec succès.");
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="bookings-page-v2 crud-page">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion admin</span>
          <h1>Catégories</h1>
          <p>Ajoute, renomme et supprime les catégories de véhicules.</p>
        </div>
        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>Total</span>
            <strong>{categories.length}</strong>
          </div>
        </div>
      </section>

      {(error || success) && <Alert kind={error ? "error" : "success"}>{error || success}</Alert>}

      <section className="crud-toolbar">
        <input
          type="text"
          placeholder="Rechercher une catégorie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="crud-primary-btn" type="button" onClick={openCreate}>
          + Nouvelle catégorie
        </button>
      </section>

      <section className="crud-card">
        {loading ? (
          <div className="crud-empty">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="crud-empty">Aucune catégorie trouvée.</div>
        ) : (
          <div className="crud-table-wrap">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <div className="crud-actions">
                        <button
                          type="button"
                          className="crud-action-btn crud-action-btn--edit"
                          onClick={() => openEdit(item)}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          className="crud-action-btn crud-action-btn--delete"
                          onClick={() => setToDelete(item)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="crud-modal-overlay" onClick={closeForm}>
          <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crud-modal-header">
              <h3>{editing ? "Modifier la catégorie" : "Créer une catégorie"}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="crud-modal-body">
                <div className="crud-form-field">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ name: e.target.value })}
                  />
                </div>
              </div>
              <div className="crud-modal-footer">
                <button type="button" className="btn-secondary" onClick={closeForm} disabled={submitting}>
                  Annuler
                </button>
                <button type="submit" className="crud-primary-btn" disabled={submitting}>
                  {submitting ? "Enregistrement..." : editing ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        title="Confirmer la suppression"
        message={toDelete ? `Supprimer la catégorie "${toDelete.name}" ?` : ""}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
