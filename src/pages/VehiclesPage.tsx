import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminToken } from "../services/authService";
import ConfirmModal from "../components/ConfirmModal";
import Alert from "../components/Alert";
import "../styles/vehicles-page.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5167/api";

type Category = {
  id: string;
  name: string;
};

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  slug: string;
  basePriceDay: number;
  gearbox: string;
  fuel: string;
  seats: number;
  bags: number;
  available: boolean;
  image?: string | null;
  categoryId?: string;
  category?: Category | null;
  createdAt?: string;
  updatedAt?: string;
};

type VehicleFormData = {
  brand: string;
  model: string;
  basePriceDay: number | "";
  gearbox: string;
  fuel: string;
  seats: number | "";
  bags: number | "";
  available: boolean;
  image: string;
  imageFile: File | null;
  categoryId: string;
};

const emptyForm: VehicleFormData = {
  brand: "",
  model: "",
  basePriceDay: "",
  gearbox: "Auto",
  fuel: "Essence",
  seats: "",
  bags: "",
  available: true,
  image: "",
  imageFile: null,
  categoryId: "",
};

export default function VehiclesPage() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const [form, setForm] = useState<VehicleFormData>(emptyForm);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function loadInitialData() {
    await Promise.all([loadVehicles(), loadCategories()]);
  }

  async function loadCategories() {
    const token = getAdminToken();

    if (!token) {
      setPageError("Token admin introuvable. Reconnecte-toi.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data?.message || "Impossible de charger les catégories.");
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setPageError(error?.message || "Impossible de charger les catégories.");
    }
  }

  async function loadVehicles() {
    setLoading(true);
    setPageError("");

    const token = getAdminToken();

    if (!token) {
      setPageError("Token admin introuvable. Reconnecte-toi.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => []);

      if (!res.ok) {
        throw new Error(data?.message || "Impossible de charger les véhicules.");
      }

      const normalizedVehicles: Vehicle[] = Array.isArray(data)
        ? data.map((vehicle: any) => ({
            ...vehicle,
            categoryId: vehicle.categoryId || vehicle.category?.id || "",
          }))
        : [];

      setVehicles(normalizedVehicles);
    } catch (error: any) {
      setPageError(error?.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const filteredVehicles = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !keyword ||
        vehicle.brand?.toLowerCase().includes(keyword) ||
        vehicle.model?.toLowerCase().includes(keyword) ||
        vehicle.slug?.toLowerCase().includes(keyword) ||
        vehicle.gearbox?.toLowerCase().includes(keyword) ||
        vehicle.fuel?.toLowerCase().includes(keyword) ||
        vehicle.category?.name?.toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "all" ||
        vehicle.categoryId === categoryFilter ||
        vehicle.category?.id === categoryFilter;

      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && vehicle.available) ||
        (availabilityFilter === "unavailable" && !vehicle.available);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [vehicles, search, categoryFilter, availabilityFilter]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.available).length;
    const unavailable = total - available;
    const avgPrice =
      total > 0
        ? Math.round(
            vehicles.reduce((sum, v) => sum + (Number(v.basePriceDay) || 0), 0) / total
          )
        : 0;

    return { total, available, unavailable, avgPrice };
  }, [vehicles]);

  function updateForm<K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetImagePreview() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview("");
  }

  function openCreateModal() {
    setEditingVehicle(null);
    setForm(emptyForm);
    setActionError("");
    resetImagePreview();
    setIsFormOpen(true);
  }

  function openEditModal(vehicle: Vehicle) {
    setEditingVehicle(vehicle);
    setForm({
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      basePriceDay: vehicle.basePriceDay ?? "",
      gearbox: vehicle.gearbox || "Auto",
      fuel: vehicle.fuel || "Essence",
      seats: vehicle.seats ?? "",
      bags: vehicle.bags ?? "",
      available: !!vehicle.available,
      image: vehicle.image || "",
      imageFile: null,
      categoryId: vehicle.categoryId || vehicle.category?.id || "",
    });
    setActionError("");
    resetImagePreview();
    setIsFormOpen(true);
  }

  function openDetailsModal(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setIsDetailsOpen(true);
  }

  function closeModals() {
    if (saving || uploadingImage) return;
    setIsFormOpen(false);
    setIsDetailsOpen(false);
    setEditingVehicle(null);
    setSelectedVehicle(null);
    setActionError("");
    resetImagePreview();
  }

  function validateForm() {
    if (!form.brand.trim()) return "La marque est obligatoire.";
    if (!form.model.trim()) return "Le modèle est obligatoire.";
    if (form.basePriceDay === "" || Number(form.basePriceDay) <= 0) {
      return "Le prix/jour doit être supérieur à 0.";
    }
    if (!form.gearbox.trim()) return "La boîte de vitesse est obligatoire.";
    if (!form.fuel.trim()) return "Le carburant est obligatoire.";
    if (form.seats === "" || Number(form.seats) <= 0) {
      return "Le nombre de places doit être supérieur à 0.";
    }
    if (form.bags === "" || Number(form.bags) < 0) {
      return "Le nombre de bagages est invalide.";
    }
    if (!form.categoryId) return "La catégorie est obligatoire.";

    return "";
  }

  function handleImageFileChange(file: File | null) {
    setActionError("");

    if (!file) {
      setForm((prev) => ({
        ...prev,
        imageFile: null,
      }));
      resetImagePreview();
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setActionError("Format invalide. Autorisés : jpg, jpeg, png, webp.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionError("Image trop volumineuse. Maximum 5 MB.");
      return;
    }

    resetImagePreview();

    setForm((prev) => ({
      ...prev,
      imageFile: file,
    }));

    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadVehicleImage(file: File): Promise<string> {
    const token = getAdminToken();

    if (!token) {
      throw new Error("Token admin introuvable. Reconnecte-toi.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/uploads/vehicle-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.message || "Upload image impossible.");
    }

    if (!data?.imageUrl) {
      throw new Error("URL image manquante après upload.");
    }

    return data.imageUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setSuccessMessage("");

    const token = getAdminToken();

    if (!token) {
      setActionError("Token admin introuvable. Reconnecte-toi.");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setActionError(validationError);
      return;
    }

    try {
      setSaving(true);

      let imageUrl = form.image.trim();

      if (form.imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadVehicleImage(form.imageFile);
        setUploadingImage(false);
      }

      const payload = {
        brand: form.brand.trim(),
        model: form.model.trim(),
        basePriceDay: Number(form.basePriceDay),
        gearbox: form.gearbox.trim(),
        fuel: form.fuel.trim(),
        seats: Number(form.seats),
        bags: Number(form.bags),
        available: form.available,
        image: imageUrl || null,
        categoryId: form.categoryId,
      };

      const isEdit = !!editingVehicle;
      const url = isEdit
        ? `${API_BASE_URL}/vehicles/${editingVehicle!.id}`
        : `${API_BASE_URL}/vehicles`;

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Enregistrement impossible.");
      }

      await loadInitialData();
      setIsFormOpen(false);
      setEditingVehicle(null);
      setForm(emptyForm);
      resetImagePreview();
      setSuccessMessage(isEdit ? "Véhicule modifié avec succès." : "Véhicule ajouté avec succès.");
    } catch (error: any) {
      setActionError(error?.message || "Une erreur est survenue.");
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  async function confirmDeleteVehicle() {
    if (!vehicleToDelete) return;

    const token = getAdminToken();

    if (!token) {
      setActionError("Token admin introuvable. Reconnecte-toi.");
      return;
    }

    setActionError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/${vehicleToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Suppression impossible.");
      }

      await loadVehicles();

      setSuccessMessage(
        data?.message || "Véhicule supprimé avec succès."
      );
    } catch (error: any) {
      setActionError(error?.message || "Une erreur est survenue.");
    } finally {
      setVehicleToDelete(null);
    }
  }

  async function handleToggleAvailability(vehicle: Vehicle) {
    const token = getAdminToken();

    if (!token) {
      setActionError("Token admin introuvable. Reconnecte-toi.");
      return;
    }

    setActionError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE_URL}/vehicles/${vehicle.id}/availability`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          available: !vehicle.available,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Changement de disponibilité impossible.");
      }

      await loadVehicles();

      setSuccessMessage(
        !vehicle.available
          ? "Véhicule marqué comme indisponible."
          : "Véhicule marqué comme disponible."
      );
    } catch (error: any) {
      setActionError(error?.message || "Une erreur est survenue.");
    }
  }

  return (
    <div className="bookings-page-v2 vehicles-admin-page">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Admin · Car4Rent</span>
          <h1>Gestion des véhicules</h1>
          <p>Ajoute, modifie et pilote la disponibilité de tout ton parc.</p>
        </div>

        <div className="bookings-header-right">
          <button
            className="btn-neutral"
            onClick={openCreateModal}
            type="button"
            style={{ height: 44, padding: "0 20px" }}
          >
            + Ajouter un véhicule
          </button>
        </div>
      </section>

      <section className="vehicles-admin-stats">
        <article className="vehicles-stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="vehicles-stat-card">
          <span>Disponibles</span>
          <strong>{stats.available}</strong>
        </article>
        <article className="vehicles-stat-card">
          <span>Indisponibles</span>
          <strong>{stats.unavailable}</strong>
        </article>
        <article className="vehicles-stat-card">
          <span>Prix moyen / jour</span>
          <strong>{stats.avgPrice} €</strong>
        </article>
      </section>

      <section className="vehicles-admin-toolbar">
        <div className="vehicles-admin-search">
          <input
            type="text"
            placeholder="Rechercher une voiture..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="vehicles-admin-filters">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Toutes les catégories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
          >
            <option value="all">Toutes disponibilités</option>
            <option value="available">Disponibles</option>
            <option value="unavailable">Indisponibles</option>
          </select>
        </div>
      </section>

      {successMessage && <Alert kind="success">{successMessage}</Alert>}
      {(pageError || actionError) && <Alert kind="error">{pageError || actionError}</Alert>}

      <section className="vehicles-admin-table-card">
        {loading ? (
          <div className="vehicles-admin-loading">
            <div className="vehicles-skeleton-row" />
            <div className="vehicles-skeleton-row" />
            <div className="vehicles-skeleton-row" />
            <div className="vehicles-skeleton-row" />
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="vehicles-admin-empty">Aucun véhicule trouvé.</div>
        ) : (
          <div className="vehicles-admin-table-wrap">
            <table className="vehicles-admin-table">
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Catégorie</th>
                  <th>Prix/jour</th>
                  <th>Boîte</th>
                  <th>Carburant</th>
                  <th>Places</th>
                  <th>Bagages</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <div className="vehicle-cell-main">
                        <div className="vehicle-thumb">
                          {vehicle.image ? (
                            <img src={vehicle.image} alt={`${vehicle.brand} ${vehicle.model}`} />
                          ) : (
                            <span>Pas d’image</span>
                          )}
                        </div>
                        <div className="vehicle-main-text">
                          <strong>
                            {vehicle.brand} {vehicle.model}
                          </strong>
                          <span>{vehicle.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>{vehicle.category?.name || "—"}</td>
                    <td>{vehicle.basePriceDay} €</td>
                    <td>{vehicle.gearbox}</td>
                    <td>{vehicle.fuel}</td>
                    <td>{vehicle.seats}</td>
                    <td>{vehicle.bags}</td>
                    <td>
                      <span
                        className={`vehicle-status-badge ${
                          vehicle.available
                            ? "vehicle-status-badge--available"
                            : "vehicle-status-badge--unavailable"
                        }`}
                      >
                        {vehicle.available ? "Disponible" : "Indisponible"}
                      </span>
                    </td>
                    <td>
                      <div className="vehicle-actions">
                        <button
                          className="vehicle-action-btn vehicle-action-btn--ghost"
                          onClick={() => openDetailsModal(vehicle)}
                          type="button"
                        >
                          Voir
                        </button>

                        <button
                          className="vehicle-action-btn vehicle-action-btn--edit"
                          onClick={() => openEditModal(vehicle)}
                          type="button"
                        >
                          Modifier
                        </button>

                        <button
                          className="vehicle-action-btn vehicle-action-btn--toggle"
                          onClick={() => void handleToggleAvailability(vehicle)}
                          type="button"
                        >
                          {vehicle.available ? "Désactiver" : "Activer"}
                        </button>

                        <button
                          className="vehicle-action-btn vehicle-action-btn--delete"
                          onClick={() => setVehicleToDelete(vehicle)}
                          type="button"
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

      {isFormOpen && (
        <div className="vehicle-modal-overlay" onClick={closeModals}>
          <div className="vehicle-modal vehicle-modal--large" onClick={(e) => e.stopPropagation()}>
            <div className="vehicle-modal-header">
              <div>
                <h3>{editingVehicle ? "Modifier le véhicule" : "Ajouter un véhicule"}</h3>
                <p>
                  {editingVehicle
                    ? "Mets à jour les informations de la voiture."
                    : "Ajoute une nouvelle voiture à ton parc."}
                </p>
              </div>

              <button className="vehicle-modal-close" onClick={closeModals} type="button">
                ×
              </button>
            </div>

            <form className="vehicle-form" onSubmit={handleSubmit}>
              <div className="vehicle-form-grid">
                <div className="vehicle-form-field">
                  <label>Marque</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => updateForm("brand", e.target.value)}
                    placeholder="Ex: Renault"
                  />
                </div>

                <div className="vehicle-form-field">
                  <label>Modèle</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => updateForm("model", e.target.value)}
                    placeholder="Ex: Clio 5"
                  />
                </div>

                <div className="vehicle-form-field">
                  <label>Prix de base / jour (€)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.basePriceDay}
                    onChange={(e) =>
                      updateForm("basePriceDay", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Ex: 120"
                  />
                </div>

                <div className="vehicle-form-field">
                  <label>Catégorie</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => updateForm("categoryId", e.target.value)}
                  >
                    <option value="">Choisir une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="vehicle-form-field">
                  <label>Boîte de vitesse</label>
                  <select
                    value={form.gearbox}
                    onChange={(e) => updateForm("gearbox", e.target.value)}
                  >
                    <option value="Auto">Auto</option>
                    <option value="Manuel">Manuel</option>
                  </select>
                </div>

                <div className="vehicle-form-field">
                  <label>Carburant</label>
                  <select
                    value={form.fuel}
                    onChange={(e) => updateForm("fuel", e.target.value)}
                  >
                    <option value="Essence">Essence</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybride">Hybride</option>
                    <option value="Électrique">Électrique</option>
                  </select>
                </div>

                <div className="vehicle-form-field">
                  <label>Nombre de places</label>
                  <input
                    type="number"
                    min="1"
                    value={form.seats}
                    onChange={(e) =>
                      updateForm("seats", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Ex: 5"
                  />
                </div>

                <div className="vehicle-form-field">
                  <label>Nombre de bagages</label>
                  <input
                    type="number"
                    min="0"
                    value={form.bags}
                    onChange={(e) =>
                      updateForm("bags", e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Ex: 3"
                  />
                </div>

                <div className="vehicle-form-field vehicle-form-field--full">
                  <label>Image du véhicule</label>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleImageFileChange(e.target.files?.[0] || null)}
                  />

                  {(imagePreview || form.image) && (
                    <div className="vehicle-upload-preview">
                      <img src={imagePreview || form.image} alt="Prévisualisation véhicule" />
                    </div>
                  )}
                </div>

                <div className="vehicle-form-switch vehicle-form-field--full">
                  <label className="vehicle-switch-label">
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={(e) => updateForm("available", e.target.checked)}
                    />
                    <span>Véhicule disponible</span>
                  </label>
                </div>
              </div>

              {actionError && <Alert kind="error">{actionError}</Alert>}

              <div className="vehicle-modal-footer">
                <button
                  className="vehicle-secondary-btn"
                  type="button"
                  onClick={closeModals}
                  disabled={saving || uploadingImage}
                >
                  Annuler
                </button>

                <button
                  className="vehicles-admin-primary-btn"
                  type="submit"
                  disabled={saving || uploadingImage}
                >
                  {uploadingImage
                    ? "Upload image..."
                    : saving
                    ? "Enregistrement..."
                    : editingVehicle
                    ? "Enregistrer les modifications"
                    : "Créer le véhicule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailsOpen && selectedVehicle && (
        <div className="vehicle-modal-overlay" onClick={closeModals}>
          <div className="vehicle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vehicle-modal-header">
              <div>
                <h3>Détails du véhicule</h3>
                <p>
                  {selectedVehicle.brand} {selectedVehicle.model}
                </p>
              </div>

              <button className="vehicle-modal-close" onClick={closeModals} type="button">
                ×
              </button>
            </div>

            <div className="vehicle-details">
              <div className="vehicle-details-image">
                {selectedVehicle.image ? (
                  <img
                    src={selectedVehicle.image}
                    alt={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                  />
                ) : (
                  <div className="vehicle-details-noimage">Pas d’image</div>
                )}
              </div>

              <div className="vehicle-details-grid">
                <div><span>Marque</span><strong>{selectedVehicle.brand}</strong></div>
                <div><span>Modèle</span><strong>{selectedVehicle.model}</strong></div>
                <div><span>Slug</span><strong>{selectedVehicle.slug}</strong></div>
                <div><span>Catégorie</span><strong>{selectedVehicle.category?.name || "—"}</strong></div>
                <div><span>Prix / jour</span><strong>{selectedVehicle.basePriceDay} €</strong></div>
                <div><span>Boîte</span><strong>{selectedVehicle.gearbox}</strong></div>
                <div><span>Carburant</span><strong>{selectedVehicle.fuel}</strong></div>
                <div><span>Places</span><strong>{selectedVehicle.seats}</strong></div>
                <div><span>Bagages</span><strong>{selectedVehicle.bags}</strong></div>
                <div><span>Disponibilité</span><strong>{selectedVehicle.available ? "Disponible" : "Indisponible"}</strong></div>
                <div><span>Créé le</span><strong>{selectedVehicle.createdAt ? new Date(selectedVehicle.createdAt).toLocaleString() : "—"}</strong></div>
                <div><span>Mis à jour le</span><strong>{selectedVehicle.updatedAt ? new Date(selectedVehicle.updatedAt).toLocaleString() : "—"}</strong></div>
              </div>
            </div>

            <div className="vehicle-modal-footer">
              <button className="vehicle-secondary-btn" type="button" onClick={closeModals}>
                Fermer
              </button>

              <button
                className="vehicle-secondary-btn"
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                  navigate(`/admin/tariffs?vehicleId=${selectedVehicle.id}`);
                }}
              >
                Gérer tarifs
              </button>

              <button
                className="vehicles-admin-primary-btn"
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                  openEditModal(selectedVehicle);
                }}
              >
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!vehicleToDelete}
        title="Confirmer la suppression"
        message={
          vehicleToDelete
            ? `Supprimer ${vehicleToDelete.brand} ${vehicleToDelete.model} ?`
            : ""
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void confirmDeleteVehicle()}
        onCancel={() => setVehicleToDelete(null)}
      />
    </div>
  );
}