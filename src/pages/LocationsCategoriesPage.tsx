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

type City = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

type EntityType = "city" | "category";

type FormState = {
  name: string;
};

const emptyForm: FormState = {
  name: "",
};

export default function LocationsCategoriesPage() {
  const [activeTab, setActiveTab] = useState<EntityType>("city");

  const [cities, setCities] = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [searchCity, setSearchCity] = useState("");
  const [searchCategory, setSearchCategory] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<EntityType>("city");
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [toDeleteCity, setToDeleteCity] = useState<City | null>(null);
  const [toDeleteCategory, setToDeleteCategory] = useState<Category | null>(null);

  useEffect(() => {
    void Promise.all([loadCities(), loadCategories()]);
  }, []);

  const filteredCities = useMemo(() => {
    const q = searchCity.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((item) => item.name.toLowerCase().includes(q));
  }, [cities, searchCity]);

  const filteredCategories = useMemo(() => {
    const q = searchCategory.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((item) => item.name.toLowerCase().includes(q));
  }, [categories, searchCategory]);

  async function loadCities() {
    try {
      setLoadingCities(true);
      const res = await adminFetch("/cities");
      const data = await res.json().catch(() => []);
      setCities(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les villes.");
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const res = await adminFetch("/categories");
      const data = await res.json().catch(() => []);
      setCategories(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les catégories.");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }

  function resetMessages() {
    setError("");
    setSuccess("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingCity(null);
    setEditingCategory(null);
    setForm(emptyForm);
  }

  function openCreate(type: EntityType) {
    resetMessages();
    setFormType(type);
    setEditingCity(null);
    setEditingCategory(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditCity(item: City) {
    resetMessages();
    setFormType("city");
    setEditingCity(item);
    setEditingCategory(null);
    setForm({ name: item.name });
    setShowForm(true);
  }

  function openEditCategory(item: Category) {
    resetMessages();
    setFormType("category");
    setEditingCity(null);
    setEditingCategory(item);
    setForm({ name: item.name });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }

    try {
      setSubmitting(true);
      resetMessages();

      if (formType === "city") {
        if (editingCity) {
          const res = await adminFetch(`/cities/${editingCity.id}`, {
            method: "PUT",
            body: JSON.stringify({ name: form.name.trim() }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.message || "Échec de la mise à jour de la ville.");
          }

          setSuccess("Ville modifiée avec succès.");
        } else {
          const res = await adminFetch(`/cities`, {
            method: "POST",
            body: JSON.stringify({ name: form.name.trim() }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.message || "Échec de la création de la ville.");
          }

          setSuccess("Ville créée avec succès.");
        }

        await loadCities();
      } else {
        if (editingCategory) {
          const res = await adminFetch(`/categories/${editingCategory.id}`, {
            method: "PUT",
            body: JSON.stringify({ name: form.name.trim() }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.message || "Échec de la mise à jour de la catégorie.");
          }

          setSuccess("Catégorie modifiée avec succès.");
        } else {
          const res = await adminFetch(`/categories`, {
            method: "POST",
            body: JSON.stringify({ name: form.name.trim() }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.message || "Échec de la création de la catégorie.");
          }

          setSuccess("Catégorie créée avec succès.");
        }

        await loadCategories();
      }

      closeForm();
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteCity() {
    if (!toDeleteCity) return;

    try {
      resetMessages();
      const res = await adminFetch(`/cities/${toDeleteCity.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Suppression impossible.");
      }

      setCities((prev) => prev.filter((item) => item.id !== toDeleteCity.id));
      setSuccess("Ville supprimée avec succès.");
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setToDeleteCity(null);
    }
  }

  async function confirmDeleteCategory() {
    if (!toDeleteCategory) return;

    try {
      resetMessages();
      const res = await adminFetch(`/categories/${toDeleteCategory.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Suppression impossible.");
      }

      setCategories((prev) => prev.filter((item) => item.id !== toDeleteCategory.id));
      setSuccess("Catégorie supprimée avec succès.");
    } catch (e: any) {
      setError(e?.message || "Une erreur est survenue.");
    } finally {
      setToDeleteCategory(null);
    }
  }

  const currentCount = activeTab === "city" ? cities.length : categories.length;
  const isLoadingCurrent = activeTab === "city" ? loadingCities : loadingCategories;

  return (
    <div className="bookings-page-v2 crud-page">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion admin</span>
          <h1>Villes & catégories</h1>
          <p>Gère dans une seule interface les villes et les catégories de véhicules.</p>
        </div>

        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>{activeTab === "city" ? "Villes" : "Catégories"}</span>
            <strong>{currentCount}</strong>
          </div>
        </div>
      </section>

      {(error || success) && (
        <Alert kind={error ? "error" : "success"}>
          {error || success}
        </Alert>
      )}

      <section
        className="crud-card"
        style={{
          marginBottom: "18px",
          padding: "18px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className={`crud-primary-btn ${activeTab === "city" ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab("city")}
          >
            Villes
          </button>

          <button
            type="button"
            className={`crud-primary-btn ${activeTab === "category" ? "" : "btn-secondary"}`}
            onClick={() => setActiveTab("category")}
          >
            Catégories
          </button>
        </div>

        <button
          className="crud-primary-btn"
          type="button"
          onClick={() => openCreate(activeTab)}
        >
          {activeTab === "city" ? "+ Nouvelle ville" : "+ Nouvelle catégorie"}
        </button>
      </section>

      {activeTab === "city" && (
        <>
          <section className="crud-toolbar">
            <input
              type="text"
              placeholder="Rechercher une ville..."
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
            />
          </section>

          <section className="crud-card">
            {isLoadingCurrent ? (
              <div className="crud-empty">Chargement...</div>
            ) : filteredCities.length === 0 ? (
              <div className="crud-empty">Aucune ville trouvée.</div>
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
                    {filteredCities.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>
                          <div className="crud-actions">
                            <button
                              type="button"
                              className="crud-action-btn crud-action-btn--edit"
                              onClick={() => openEditCity(item)}
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              className="crud-action-btn crud-action-btn--delete"
                              onClick={() => setToDeleteCity(item)}
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
        </>
      )}

      {activeTab === "category" && (
        <>
          <section className="crud-toolbar">
            <input
              type="text"
              placeholder="Rechercher une catégorie..."
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
            />
          </section>

          <section className="crud-card">
            {isLoadingCurrent ? (
              <div className="crud-empty">Chargement...</div>
            ) : filteredCategories.length === 0 ? (
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
                    {filteredCategories.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>
                          <div className="crud-actions">
                            <button
                              type="button"
                              className="crud-action-btn crud-action-btn--edit"
                              onClick={() => openEditCategory(item)}
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              className="crud-action-btn crud-action-btn--delete"
                              onClick={() => setToDeleteCategory(item)}
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
        </>
      )}

      {showForm && (
        <div className="crud-modal-overlay" onClick={closeForm}>
          <div className="crud-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crud-modal-header">
              <h3>
                {formType === "city"
                  ? editingCity
                    ? "Modifier la ville"
                    : "Créer une ville"
                  : editingCategory
                  ? "Modifier la catégorie"
                  : "Créer une catégorie"}
              </h3>
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="crud-primary-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "Enregistrement..."
                    : editingCity || editingCategory
                    ? "Enregistrer"
                    : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!toDeleteCity}
        title="Confirmer la suppression"
        message={toDeleteCity ? `Supprimer la ville "${toDeleteCity.name}" ?` : ""}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void confirmDeleteCity()}
        onCancel={() => setToDeleteCity(null)}
      />

      <ConfirmModal
        open={!!toDeleteCategory}
        title="Confirmer la suppression"
        message={
          toDeleteCategory
            ? `Supprimer la catégorie "${toDeleteCategory.name}" ?`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void confirmDeleteCategory()}
        onCancel={() => setToDeleteCategory(null)}
      />
    </div>
  );
}