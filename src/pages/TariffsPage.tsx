import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import Alert from "../components/Alert";
import { getAdminAccessToken } from "../services/authService";
import "../styles/tariffs-page.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5167/api";

type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  } | null;
};

type TariffBlock = {
  type: "SEASON" | "OFF_SEASON";
  priceStart: number | "";
  price3Days: number | "";
  price4To6Days: number | "";
  price7To15Days: number | "";
  price16To29Days: number | "";
  price1Month: number | "";
};

type TariffResponseBlock = {
  type: "SEASON" | "OFF_SEASON";
  priceStart: number;
  price3Days: number;
  price4To6Days: number;
  price7To15Days: number;
  price16To29Days: number;
  price1Month: number;
};

type VehicleTariffsResponse = {
  vehicleId: string;
  vehicleName?: string;
  season: TariffResponseBlock | null;
  offSeason: TariffResponseBlock | null;
};

type SeasonForm = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const emptySeasonForm: SeasonForm = {
  name: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

const emptySeasonTariff: TariffBlock = {
  type: "SEASON",
  priceStart: "",
  price3Days: "",
  price4To6Days: "",
  price7To15Days: "",
  price16To29Days: "",
  price1Month: "",
};

const emptyOffSeasonTariff: TariffBlock = {
  type: "OFF_SEASON",
  priceStart: "",
  price3Days: "",
  price4To6Days: "",
  price7To15Days: "",
  price16To29Days: "",
  price1Month: "",
};

function normalizeDate(value?: string | null) {
  if (!value) return "";
  return value.split("T")[0];
}

function toFormBlock(
  block: TariffResponseBlock | null | undefined,
  type: "SEASON" | "OFF_SEASON"
): TariffBlock {
  if (!block) {
    return type === "SEASON" ? { ...emptySeasonTariff } : { ...emptyOffSeasonTariff };
  }

  return {
    type,
    priceStart: block.priceStart,
    price3Days: block.price3Days,
    price4To6Days: block.price4To6Days,
    price7To15Days: block.price7To15Days,
    price16To29Days: block.price16To29Days,
    price1Month: block.price1Month,
  };
}

function getVehicleLabel(vehicle: Vehicle) {
  const categoryName = vehicle.category?.name ? ` • ${vehicle.category.name}` : "";
  return `${vehicle.brand} ${vehicle.model}${categoryName}`;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function TariffsPage() {
  const [searchParams] = useSearchParams();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [seasonTariffForm, setSeasonTariffForm] =
    useState<TariffBlock>(emptySeasonTariff);
  const [offSeasonTariffForm, setOffSeasonTariffForm] =
    useState<TariffBlock>(emptyOffSeasonTariff);

  const [seasonForm, setSeasonForm] = useState<SeasonForm>(emptySeasonForm);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [seasonSaving, setSeasonSaving] = useState(false);
  const [seasonError, setSeasonError] = useState("");
  const [seasonSuccess, setSeasonSuccess] = useState("");

  const [tariffsLoading, setTariffsLoading] = useState(false);
  const [tariffsSaving, setTariffsSaving] = useState(false);
  const [tariffsError, setTariffsError] = useState("");
  const [tariffsSuccess, setTariffsSuccess] = useState("");
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);

  const token = getAdminAccessToken();

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedVehicleId) {
      setSeasonTariffForm({ ...emptySeasonTariff });
      setOffSeasonTariffForm({ ...emptyOffSeasonTariff });
      setTariffsError("");
      setTariffsSuccess("");
      return;
    }

    void fetchVehicleTariffs(selectedVehicleId);
  }, [selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  function getAuthHeaders(includeJson = false): HeadersInit {
    const headers: HeadersInit = {};

    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async function loadInitialData() {
    try {
      setLoading(true);
      setPageError("");

      if (!token) {
        setPageError("Session admin introuvable. Merci de te reconnecter.");
        return;
      }

      await Promise.all([fetchSeasons(), fetchVehicles()]);
    } catch (error) {
      console.error(error);
      setPageError("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSeasons() {
    const res = await fetch(`${API}/seasons`, {
      headers: getAuthHeaders(),
    });

    const data = await parseJsonSafe<Season[] | { message?: string }>(res);

    if (!res.ok) {
      throw new Error(
        !Array.isArray(data) && data?.message
          ? data.message
          : "Failed to load seasons"
      );
    }

    setSeasons(Array.isArray(data) ? data : []);
  }

  async function fetchVehicles() {
    const res = await fetch(`${API}/vehicles`, {
      headers: getAuthHeaders(),
    });

    const data = await parseJsonSafe<Vehicle[] | { message?: string }>(res);

    if (!res.ok) {
      throw new Error(
        !Array.isArray(data) && data?.message
          ? data.message
          : "Failed to load vehicles"
      );
    }

    const list = Array.isArray(data) ? data : [];
    setVehicles(list);

    const vehicleIdFromQuery = searchParams.get("vehicleId");

    if (vehicleIdFromQuery && list.some((vehicle) => vehicle.id === vehicleIdFromQuery)) {
      setSelectedVehicleId(vehicleIdFromQuery);
      return;
    }

    if (list.length > 0) {
      setSelectedVehicleId((prev) => prev || list[0].id);
    }
  }

  async function fetchVehicleTariffs(vehicleId: string) {
    try {
      setTariffsLoading(true);
      setTariffsError("");
      setTariffsSuccess("");

      const res = await fetch(`${API}/vehicles/tarifs/${vehicleId}`, {
        headers: getAuthHeaders(),
      });

      const data = await parseJsonSafe<VehicleTariffsResponse & { message?: string }>(res);

      if (!res.ok) {
        setTariffsError(data?.message || "Impossible de charger les tarifs.");
        setSeasonTariffForm({ ...emptySeasonTariff });
        setOffSeasonTariffForm({ ...emptyOffSeasonTariff });
        return;
      }

      setSeasonTariffForm(toFormBlock(data?.season, "SEASON"));
      setOffSeasonTariffForm(toFormBlock(data?.offSeason, "OFF_SEASON"));
    } catch (error) {
      console.error(error);
      setTariffsError("Impossible de charger les tarifs du véhicule.");
      setSeasonTariffForm({ ...emptySeasonTariff });
      setOffSeasonTariffForm({ ...emptyOffSeasonTariff });
    } finally {
      setTariffsLoading(false);
    }
  }

  function resetSeasonMessages() {
    setSeasonError("");
    setSeasonSuccess("");
  }

  function resetTariffMessages() {
    setTariffsError("");
    setTariffsSuccess("");
  }

  function handleSeasonChange(field: keyof SeasonForm, value: string | boolean) {
    setSeasonForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleTariffChange(
    type: "SEASON" | "OFF_SEASON",
    field: keyof Omit<TariffBlock, "type">,
    value: number | ""
  ) {
    if (type === "SEASON") {
      setSeasonTariffForm((prev) => ({
        ...prev,
        [field]: value,
      }));
      return;
    }

    setOffSeasonTariffForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function validateSeasonForm() {
    if (!seasonForm.name.trim()) return "Le nom de la saison est obligatoire.";
    if (!seasonForm.startDate) return "La date de début est obligatoire.";
    if (!seasonForm.endDate) return "La date de fin est obligatoire.";
    if (seasonForm.startDate > seasonForm.endDate) {
      return "La date de début doit être avant la date de fin.";
    }
    return "";
  }

  function validateTariffBlock(block: TariffBlock, label: string) {
    const values = [
      { key: "Prix à partir", value: block.priceStart },
      { key: "Prix 3 jours", value: block.price3Days },
      { key: "Prix 4 à 6 jours", value: block.price4To6Days },
      { key: "Prix 7 à 15 jours", value: block.price7To15Days },
      { key: "Prix 16 à 29 jours", value: block.price16To29Days },
      { key: "Prix 1 mois", value: block.price1Month },
    ];

    for (const item of values) {
      if (item.value === "" || Number(item.value) < 0) {
        return `${label} : ${item.key} est obligatoire et doit être supérieur ou égal à 0.`;
      }
    }

    return "";
  }

  async function createSeason() {
    resetSeasonMessages();

    if (!token) {
      setSeasonError("Session admin introuvable. Merci de te reconnecter.");
      return;
    }

    const validation = validateSeasonForm();
    if (validation) {
      setSeasonError(validation);
      return;
    }

    try {
      setSeasonSaving(true);

      const res = await fetch(`${API}/seasons`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          name: seasonForm.name.trim(),
          startDate: seasonForm.startDate,
          endDate: seasonForm.endDate,
          isActive: seasonForm.isActive,
        }),
      });

      const data = await parseJsonSafe<{ message?: string }>(res);

      if (!res.ok) {
        setSeasonError(data?.message || "Erreur lors de la création de la saison.");
        return;
      }

      setSeasonForm({ ...emptySeasonForm });
      setSeasonSuccess("Saison créée avec succès.");
      await fetchSeasons();
    } catch (error) {
      console.error(error);
      setSeasonError("Erreur lors de la création de la saison.");
    } finally {
      setSeasonSaving(false);
    }
  }

  function openEditSeason(season: Season) {
    resetSeasonMessages();
    setEditingSeason(season);
    setSeasonForm({
      name: season.name,
      startDate: normalizeDate(season.startDate),
      endDate: normalizeDate(season.endDate),
      isActive: season.isActive,
    });
  }

  async function updateSeason() {
    if (!editingSeason) return;

    resetSeasonMessages();

    if (!token) {
      setSeasonError("Session admin introuvable. Merci de te reconnecter.");
      return;
    }

    const validation = validateSeasonForm();
    if (validation) {
      setSeasonError(validation);
      return;
    }

    try {
      setSeasonSaving(true);

      const res = await fetch(`${API}/seasons/${editingSeason.id}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          name: seasonForm.name.trim(),
          startDate: seasonForm.startDate,
          endDate: seasonForm.endDate,
          isActive: seasonForm.isActive,
        }),
      });

      const data = await parseJsonSafe<{ message?: string }>(res);

      if (!res.ok) {
        setSeasonError(data?.message || "Erreur lors de la modification de la saison.");
        return;
      }

      setEditingSeason(null);
      setSeasonForm({ ...emptySeasonForm });
      setSeasonSuccess("Saison modifiée avec succès.");
      await fetchSeasons();
    } catch (error) {
      console.error(error);
      setSeasonError("Erreur lors de la modification de la saison.");
    } finally {
      setSeasonSaving(false);
    }
  }

  async function performDeleteSeason() {
    if (!seasonToDelete) return;

    if (!token) {
      setSeasonError("Session admin introuvable. Merci de te reconnecter.");
      setSeasonToDelete(null);
      return;
    }

    try {
      const res = await fetch(`${API}/seasons/${seasonToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const data = await parseJsonSafe<{ message?: string }>(res);

      if (!res.ok) {
        setSeasonError(data?.message || "Impossible de supprimer cette saison.");
      } else {
        setSeasonSuccess("Saison supprimée avec succès.");
        await fetchSeasons();
      }
    } catch (error) {
      console.error(error);
      setSeasonError("Erreur lors de la suppression de la saison.");
    } finally {
      setSeasonToDelete(null);
    }
  }

  function closeSeasonModal() {
    setEditingSeason(null);
    setSeasonForm({ ...emptySeasonForm });
    resetSeasonMessages();
  }

  async function saveTariffs() {
    if (!selectedVehicleId) {
      setTariffsError("Choisis un véhicule.");
      return;
    }

    if (!token) {
      setTariffsError("Session admin introuvable. Merci de te reconnecter.");
      return;
    }

    resetTariffMessages();

    const seasonValidation = validateTariffBlock(seasonTariffForm, "Tarif saison");
    if (seasonValidation) {
      setTariffsError(seasonValidation);
      return;
    }

    const offSeasonValidation = validateTariffBlock(offSeasonTariffForm, "Tarif hors saison");
    if (offSeasonValidation) {
      setTariffsError(offSeasonValidation);
      return;
    }

    try {
      setTariffsSaving(true);

      const seasonPayload = {
        type: "SEASON",
        priceStart: Number(seasonTariffForm.priceStart),
        price3Days: Number(seasonTariffForm.price3Days),
        price4To6Days: Number(seasonTariffForm.price4To6Days),
        price7To15Days: Number(seasonTariffForm.price7To15Days),
        price16To29Days: Number(seasonTariffForm.price16To29Days),
        price1Month: Number(seasonTariffForm.price1Month),
      };

      const offSeasonPayload = {
        type: "OFF_SEASON",
        priceStart: Number(offSeasonTariffForm.priceStart),
        price3Days: Number(offSeasonTariffForm.price3Days),
        price4To6Days: Number(offSeasonTariffForm.price4To6Days),
        price7To15Days: Number(offSeasonTariffForm.price7To15Days),
        price16To29Days: Number(offSeasonTariffForm.price16To29Days),
        price1Month: Number(offSeasonTariffForm.price1Month),
      };

      const [seasonRes, offSeasonRes] = await Promise.all([
        fetch(`${API}/tariff-settings/vehicle/${selectedVehicleId}/SEASON`, {
          method: "PUT",
          headers: getAuthHeaders(true),
          body: JSON.stringify(seasonPayload),
        }),
        fetch(`${API}/tariff-settings/vehicle/${selectedVehicleId}/OFF_SEASON`, {
          method: "PUT",
          headers: getAuthHeaders(true),
          body: JSON.stringify(offSeasonPayload),
        }),
      ]);

      const seasonData = await parseJsonSafe<{ message?: string }>(seasonRes);
      const offSeasonData = await parseJsonSafe<{ message?: string }>(offSeasonRes);

      if (!seasonRes.ok) {
        setTariffsError(
          seasonData?.message || "Erreur lors de l’enregistrement du tarif saison."
        );
        return;
      }

      if (!offSeasonRes.ok) {
        setTariffsError(
          offSeasonData?.message || "Erreur lors de l’enregistrement du tarif hors saison."
        );
        return;
      }

      setTariffsSuccess("Tarifs enregistrés avec succès.");
      await fetchVehicleTariffs(selectedVehicleId);
    } catch (error) {
      console.error(error);
      setTariffsError("Erreur lors de l’enregistrement des tarifs.");
    } finally {
      setTariffsSaving(false);
    }
  }

  return (
    <div className="bookings-page-v2 tariffs-page-modern">
      <section className="bookings-header">
        <div className="bookings-header-left">
          <span className="bookings-kicker">Gestion admin</span>
          <h1>Tarifs & saisons</h1>
          <p>
            Gère les périodes saisonnières et les tarifs dédiés à chaque voiture
            pour la saison et le hors saison.
          </p>
        </div>

        <div className="bookings-header-right">
          <div className="bookings-highlight-card">
            <span>Véhicules</span>
            <strong>{vehicles.length}</strong>
          </div>
        </div>
      </section>

      <section className="tariffs-admin-stats">
        <article className="tariffs-admin-stat-card">
          <span>Saisons</span>
          <strong>{seasons.length}</strong>
        </article>

        <article className="tariffs-admin-stat-card">
          <span>Véhicules</span>
          <strong>{vehicles.length}</strong>
        </article>

        <article className="tariffs-admin-stat-card">
          <span>Véhicule sélectionné</span>
          <strong>{selectedVehicle ? 1 : 0}</strong>
        </article>
      </section>

      {pageError && <Alert kind="error">{pageError}</Alert>}

      <section className="tariffs-layout">
        <div className="tariffs-block">
          <div className="tariffs-block__header">
            <div>
              <p className="tariffs-section-tag">Saisons</p>
              <h2>Périodes tarifaires</h2>
              <span>
                Crée uniquement les périodes de saison. En dehors de ces dates,
                les tarifs hors saison s’appliquent automatiquement.
              </span>
            </div>
            <div className="tariffs-counter">{seasons.length}</div>
          </div>

          <div className="tariffs-form-card">
            <div className="tariffs-form-card__grid tariffs-form-card__grid--season">
              <div className="tariffs-input-wrap">
                <label>Nom</label>
                <input
                  type="text"
                  placeholder="Ex: Haute saison"
                  value={seasonForm.name}
                  onChange={(e) => handleSeasonChange("name", e.target.value)}
                />
              </div>

              <div className="tariffs-input-wrap">
                <label>Date début</label>
                <input
                  type="date"
                  value={seasonForm.startDate}
                  onChange={(e) => handleSeasonChange("startDate", e.target.value)}
                />
              </div>

              <div className="tariffs-input-wrap">
                <label>Date fin</label>
                <input
                  type="date"
                  value={seasonForm.endDate}
                  onChange={(e) => handleSeasonChange("endDate", e.target.value)}
                />
              </div>

              <label className="tariffs-switch">
                <input
                  type="checkbox"
                  checked={seasonForm.isActive}
                  onChange={(e) => handleSeasonChange("isActive", e.target.checked)}
                />
                <span>Active</span>
              </label>

              <button
                className="tariffs-primary-btn"
                onClick={() => void createSeason()}
                disabled={seasonSaving}
                type="button"
              >
                {seasonSaving ? "Ajout..." : "Ajouter"}
              </button>
            </div>

            {seasonError && <Alert kind="error">{seasonError}</Alert>}
            {seasonSuccess && <Alert kind="success">{seasonSuccess}</Alert>}
          </div>

          <div className="tariffs-list-card">
            {loading ? (
              <div className="tariffs-empty-state">Chargement...</div>
            ) : seasons.length === 0 ? (
              <div className="tariffs-empty-state">Aucune saison pour le moment.</div>
            ) : (
              <div className="tariffs-list">
                {seasons.map((season) => (
                  <div className="tariffs-list-item" key={season.id}>
                    <div className="tariffs-list-item__content">
                      <div className="tariffs-list-item__title-row">
                        <h3>{season.name}</h3>
                        <span
                          className={
                            season.isActive
                              ? "tariffs-pill tariffs-pill--success"
                              : "tariffs-pill tariffs-pill--muted"
                          }
                        >
                          {season.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p>
                        {new Date(season.startDate).toLocaleDateString("fr-FR")} →{" "}
                        {new Date(season.endDate).toLocaleDateString("fr-FR")}
                      </p>
                    </div>

                    <div className="tariffs-row-actions">
                      <button
                        className="tariffs-action-btn"
                        type="button"
                        onClick={() => openEditSeason(season)}
                      >
                        Modifier
                      </button>
                      <button
                        className="tariffs-action-btn tariffs-action-btn--danger"
                        type="button"
                        onClick={() => setSeasonToDelete(season)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="tariffs-block">
          <div className="tariffs-block__header">
            <div>
              <p className="tariffs-section-tag">Tarifs par voiture</p>
              <h2>Tarification véhicule</h2>
              <span>
                Choisis une voiture puis définis les tarifs saison et hors saison.
              </span>
            </div>
            <div className="tariffs-counter tariffs-counter--accent">
              {selectedVehicle ? "1" : "0"}
            </div>
          </div>

          <div className="tariffs-form-card">
            <div className="tariffs-form-advanced">
              <div className="tariffs-input-wrap tariffs-input-wrap--wide">
                <label>Véhicule</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  <option value="">Choisir un véhicule</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {getVehicleLabel(vehicle)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tariffs-input-wrap">
                <label>Voiture sélectionnée</label>
                <input
                  type="text"
                  value={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : ""}
                  disabled
                />
              </div>
            </div>

            {tariffsError && <Alert kind="error">{tariffsError}</Alert>}
            {tariffsSuccess && <Alert kind="success">{tariffsSuccess}</Alert>}
          </div>

          <div className="tariffs-list-card">
            {!selectedVehicleId ? (
              <div className="tariffs-empty-state">
                Choisis un véhicule pour configurer ses tarifs.
              </div>
            ) : tariffsLoading ? (
              <div className="tariffs-empty-state">Chargement des tarifs...</div>
            ) : (
              <div className="tariffs-list">
                <div className="tariffs-list-item tariffs-list-item--rule">
                  <div className="tariffs-list-item__content">
                    <div className="tariffs-list-item__title-row">
                      <h3>Tarifs saison</h3>
                      <span className="tariffs-pill tariffs-pill--primary">SEASON</span>
                    </div>

                    <div className="tariffs-form-advanced">
                      <div className="tariffs-input-wrap">
                        <label>Prix à partir</label>
                        <input
                          type="number"
                          min="0"
                          value={seasonTariffForm.priceStart}
                          onChange={(e) =>
                            handleTariffChange(
                              "SEASON",
                              "priceStart",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 3 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={seasonTariffForm.price3Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "SEASON",
                              "price3Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 4 à 6 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={seasonTariffForm.price4To6Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "SEASON",
                              "price4To6Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 7 à 15 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={seasonTariffForm.price7To15Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "SEASON",
                              "price7To15Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 16 à 29 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={seasonTariffForm.price16To29Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "SEASON",
                              "price16To29Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 1 mois</label>
                        <input
                          type="number"
                          min="0"
                          value={seasonTariffForm.price1Month}
                          onChange={(e) =>
                            handleTariffChange(
                              "SEASON",
                              "price1Month",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tariffs-list-item tariffs-list-item--rule">
                  <div className="tariffs-list-item__content">
                    <div className="tariffs-list-item__title-row">
                      <h3>Tarifs hors saison</h3>
                      <span className="tariffs-pill tariffs-pill--muted">OFF_SEASON</span>
                    </div>

                    <div className="tariffs-form-advanced">
                      <div className="tariffs-input-wrap">
                        <label>Prix à partir</label>
                        <input
                          type="number"
                          min="0"
                          value={offSeasonTariffForm.priceStart}
                          onChange={(e) =>
                            handleTariffChange(
                              "OFF_SEASON",
                              "priceStart",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 3 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={offSeasonTariffForm.price3Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "OFF_SEASON",
                              "price3Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 4 à 6 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={offSeasonTariffForm.price4To6Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "OFF_SEASON",
                              "price4To6Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 7 à 15 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={offSeasonTariffForm.price7To15Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "OFF_SEASON",
                              "price7To15Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 16 à 29 jours</label>
                        <input
                          type="number"
                          min="0"
                          value={offSeasonTariffForm.price16To29Days}
                          onChange={(e) =>
                            handleTariffChange(
                              "OFF_SEASON",
                              "price16To29Days",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="tariffs-input-wrap">
                        <label>Prix 1 mois</label>
                        <input
                          type="number"
                          min="0"
                          value={offSeasonTariffForm.price1Month}
                          onChange={(e) =>
                            handleTariffChange(
                              "OFF_SEASON",
                              "price1Month",
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="tariffs-row-actions">
                  <button
                    className="tariffs-primary-btn tariffs-primary-btn--dark"
                    type="button"
                    onClick={() => void saveTariffs()}
                    disabled={tariffsSaving}
                  >
                    {tariffsSaving ? "Enregistrement..." : "Enregistrer les tarifs"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {editingSeason && (
        <div className="tariffs-modal-overlay" onClick={closeSeasonModal}>
          <div className="tariffs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tariffs-modal__header">
              <h3>Modifier la saison</h3>
              <button className="tariffs-modal__close" onClick={closeSeasonModal} type="button">
                ×
              </button>
            </div>

            <div className="tariffs-modal__body">
              <div className="tariffs-input-wrap">
                <label>Nom</label>
                <input
                  type="text"
                  value={seasonForm.name}
                  onChange={(e) => handleSeasonChange("name", e.target.value)}
                />
              </div>

              <div className="tariffs-input-wrap">
                <label>Date début</label>
                <input
                  type="date"
                  value={seasonForm.startDate}
                  onChange={(e) => handleSeasonChange("startDate", e.target.value)}
                />
              </div>

              <div className="tariffs-input-wrap">
                <label>Date fin</label>
                <input
                  type="date"
                  value={seasonForm.endDate}
                  onChange={(e) => handleSeasonChange("endDate", e.target.value)}
                />
              </div>

              <label className="tariffs-switch">
                <input
                  type="checkbox"
                  checked={seasonForm.isActive}
                  onChange={(e) => handleSeasonChange("isActive", e.target.checked)}
                />
                <span>Active</span>
              </label>

              {seasonError && <Alert kind="error">{seasonError}</Alert>}
            </div>

            <div className="tariffs-modal__footer">
              <button className="tariffs-secondary-btn" onClick={closeSeasonModal} type="button">
                Annuler
              </button>
              <button
                className="tariffs-primary-btn"
                onClick={() => void updateSeason()}
                disabled={seasonSaving}
                type="button"
              >
                {seasonSaving ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!seasonToDelete}
        title="Confirmer la suppression"
        message={seasonToDelete ? `Supprimer la saison "${seasonToDelete.name}" ?` : ""}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => void performDeleteSeason()}
        onCancel={() => setSeasonToDelete(null)}
      />
    </div>
  );
}