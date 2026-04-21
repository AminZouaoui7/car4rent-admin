  import { useEffect, useMemo, useState } from "react";
  import { Link, useNavigate, useParams } from "react-router-dom";
  import ConfirmModal from "../components/ConfirmModal";
  import { adminFetch } from "../services/adminFetch";
  import "../styles/bookings-page.css";
import "../styles/booking-detail-page.css";

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
    originalPrice?: number;
    discountAmount?: number;
    promoCodeUsed?: string | null;

    status: string | number;

    isDepositPaid?: boolean;
    depositAmount?: number;
    depositPaidAt?: string;
    isFullyPaid?: boolean;
    fullyPaidAt?: string;

    createdAt?: string;
    updatedAt?: string;

    pickupCityId?: string;
    returnCityId?: string;
    vehicleId?: string;

    hasBabySeat?: boolean;
    babySeatAmount?: number;
    babySeatPercentage?: number;

    hasSecondDriver?: boolean;
    secondDriverFirstName?: string;
    secondDriverLastName?: string;
    secondDriverPhone?: string;

    hasGps?: boolean;
    gpsAmount?: number;

    hasFullTank?: boolean;
    fullTankAmount?: number;

    boosterSeatQuantity?: number;
    boosterSeatAmount?: number;

    babySeatQuantity?: number;

    childSeatQuantity?: number;
    childSeatAmount?: number;

    hasProtectionPlus?: boolean;
    protectionPlusAmount?: number;

    secondDriverAmount?: number;

    payments?: Array<{
      id?: string;
      type?: string;
      status?: string;
      amount?: number;
      provider?: string;
      transactionId?: string;
      createdAt?: string;
      paidAt?: string;
      notes?: string;
    }>;

    vehicle?: {
      id?: string;
      brand?: string;
      model?: string;
      name?: string;
      image?: string | null;
      category?: { id?: string; name?: string };
    };

    pickupCity?: { id?: string; name?: string };
    returnCity?: { id?: string; name?: string };
  };

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
    switch (normalizeStatus(status)) {
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
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("fr-FR");
  }

  function formatDateTime(date?: string) {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("fr-FR");
  }

  function formatPrice(value?: number) {
    if (value === undefined || value === null) return "—";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function normalizeImagePath(raw?: string | null) {
    if (!raw || !raw.trim()) return "";

    let path = raw.trim();

    path = path.replace(/\\/g, "/");
    path = path.replace(/^~\//, "");
    path = path.replace(/^\.?\//, "");
    path = path.replace(/^wwwroot\//i, "");
    path = path.replace(/^public\//i, "");

    return path;
  }

  function resolveVehicleImage(image?: string | null) {
    const cleaned = normalizeImagePath(image);
    if (!cleaned) return null;

    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      return cleaned;
    }

    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5167/api").replace(
      /\/api\/?$/,
      ""
    );

    if (cleaned.startsWith("/")) {
      return `${apiBase}${cleaned}`;
    }

    return `${apiBase}/${cleaned}`;
  }

  function getRemainingAmount(booking: Booking) {
    const total = booking.totalPrice ?? 0;
    const deposit = booking.isDepositPaid ? booking.depositAmount ?? 0 : 0;
    const remaining = total - deposit;
    return remaining > 0 ? remaining : 0;
  }

  function getPaymentStateLabel(booking: Booking) {
    if (booking.isFullyPaid) return "Soldée";
    if (booking.isDepositPaid) return "Acompte payé";
    return "En attente";
  }

  function getPaymentStateClass(booking: Booking) {
    if (booking.isFullyPaid) return "bdp-pay-badge bdp-pay-badge--full";
    if (booking.isDepositPaid) return "bdp-pay-badge bdp-pay-badge--deposit";
    return "bdp-pay-badge bdp-pay-badge--pending";
  }

  function getProgressFillClass(booking: Booking) {
    if (booking.isFullyPaid) return "bdp-pay-progress-fill bdp-pay-progress-fill--full";
    if (booking.isDepositPaid) return "bdp-pay-progress-fill bdp-pay-progress-fill--deposit";
    return "bdp-pay-progress-fill";
  }

  function getProgressWidth(booking: Booking) {
    if (booking.isFullyPaid) return "100%";
    if (booking.isDepositPaid) return "35%";
    return "14%";
  }

  /* icons */
  const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const IconCar = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h8l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const IconSliders = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <line x1="4" y1="21" x2="4" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="10" x2="4" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="21" x2="20" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="12" x2="20" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="14" x2="7" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const IconReceipt = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const IconCreditCard = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="1" y="4" width="22" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const IconCheck = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  const IconDollar = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const IconMail = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const IconPhone = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M22 16.9v3a2 2 0 0 1-2.2 2A19.9 19.9 0 0 1 11.1 19a19.5 19.5 0 0 1-6.1-6.1A19.9 19.9 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3.1a2 2 0 0 1-.6 1.8l-1.3 1.3a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 1.8-.6l3.1.5A2 2 0 0 1 22 16.9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const IconCalendar = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const IconMapPin = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );

  const IconShield = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-3.5 7-9V6l-7-3-7 3v6c0 5.5 7 9 7 9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m9.5 12 1.8 1.8L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const IconFuel = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M5 20V6.8A1.8 1.8 0 0 1 6.8 5h6.4A1.8 1.8 0 0 1 15 6.8V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M5 20h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="7.2" y="8" width="5.6" height="4.3" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M17 8.2 18.8 10v6.2A1.8 1.8 0 0 1 17 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const IconGps = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 14.5 16.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const IconSeat = () => (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 16c0-3.5 2.2-6 5-6s5 2.5 5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 10.5 6.8 8.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15.5 10.5 17.2 8.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  function DetailRow({
    icon,
    label,
    children,
  }: {
    icon?: React.ReactNode;
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="bdp-detail-row">
        <div className="bdp-detail-row__left">
          {icon && <span className="bdp-detail-row__icon">{icon}</span>}
          <span className="bdp-detail-row__label">{label}</span>
        </div>
        <div className="bdp-detail-row__value">{children}</div>
      </div>
    );
  }

  function TlItem({
    done,
    current,
    label,
    sub,
  }: {
    done?: boolean;
    current?: boolean;
    label: string;
    sub: string;
  }) {
    const cls = `bdp-tl-item${done ? " bdp-tl-item--done" : ""}${current ? " bdp-tl-item--current" : ""}`;

    return (
      <div className={cls}>
        <div className="bdp-tl-dot-wrap">
          <div className="bdp-tl-dot" />
        </div>
        <div>
          <div className="bdp-tl-label">{label}</div>
          <div className="bdp-tl-sub">{sub}</div>
        </div>
      </div>
    );
  }

  export default function BookingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState("");
    const [imageFailed, setImageFailed] = useState(false);
    const [confirmAction, setConfirmAction] = useState<null | {
      title: string;
      message: string;
      confirmLabel: string;
      action: () => void;
    }>(null);

    async function loadBooking() {
      try {
        setLoading(true);
        setError("");

        const response = await adminFetch(`/bookings/${id}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Erreur lors du chargement.");
        }

        setBooking(data);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement de la réservation.");
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => {
      loadBooking();
    }, [id]);

    useEffect(() => {
      setImageFailed(false);
    }, [booking?.vehicle?.image]);

    async function updateBookingStatus(status: number) {
      if (!booking) return;

      try {
        setActionLoading(true);
        setActionError("");

        const response = await adminFetch(`/bookings/${booking.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Erreur de mise à jour.");
        }

        setBooking(data.booking ?? data);
      } catch (err: any) {
        setActionError(err.message || "Une erreur est survenue.");
      } finally {
        setActionLoading(false);
      }
    }

    async function markFullyPaid() {
      if (!booking) return;

      try {
        setActionLoading(true);
        setActionError("");

        const response = await adminFetch(`/bookings/${booking.id}/mark-fully-paid`, {
          method: "PUT",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Erreur de mise à jour.");
        }

        setBooking(data.booking ?? data);
      } catch (err: any) {
        setActionError(err.message || "Une erreur est survenue.");
      } finally {
        setActionLoading(false);
      }
    }

    function openConfirm(action: {
      title: string;
      message: string;
      confirmLabel: string;
      action: () => void;
    }) {
      setConfirmAction(action);
    }

    const normalizedStatus = useMemo(() => normalizeStatus(booking?.status), [booking?.status]);
    const canMarkFullyPaid =
      normalizedStatus === "confirmed" && !!booking?.isDepositPaid && !booking?.isFullyPaid;

    const hasPromo = !!booking?.promoCodeUsed || (booking?.discountAmount ?? 0) > 0;
    const vehicleImageSrc = resolveVehicleImage(booking?.vehicle?.image);

    const activeOptionTags = useMemo(() => {
      if (!booking) return [];
      const tags: string[] = [];

      if (booking.hasSecondDriver) tags.push("2e conducteur");
      if (booking.hasGps) tags.push("GPS");
      if (booking.hasFullTank) tags.push("Plein essence");
      if (booking.hasProtectionPlus) tags.push("Protection Plus");
      if ((booking.boosterSeatQuantity ?? 0) > 0) tags.push(`Rehausseur × ${booking.boosterSeatQuantity}`);

      const babyQty = booking.babySeatQuantity ?? (booking.hasBabySeat ? 1 : 0);
      if (babyQty > 0) tags.push(`Siège bébé × ${babyQty}`);
      if ((booking.childSeatQuantity ?? 0) > 0) tags.push(`Siège enfant × ${booking.childSeatQuantity}`);

      return tags;
    }, [booking]);

    const optionsAmounts = useMemo(() => {
      if (!booking) return [];

      const rows: Array<{ label: string; amount?: number; icon: React.ReactNode }> = [];

      if (booking.hasSecondDriver) {
        rows.push({ label: "2ème conducteur", amount: booking.secondDriverAmount, icon: <IconUser /> });
      }
      if (booking.hasGps) {
        rows.push({ label: "GPS", amount: booking.gpsAmount, icon: <IconGps /> });
      }
      if (booking.hasFullTank) {
        rows.push({ label: "Plein essence", amount: booking.fullTankAmount, icon: <IconFuel /> });
      }
      if ((booking.boosterSeatQuantity ?? 0) > 0) {
        rows.push({
          label: `Rehausseur × ${booking.boosterSeatQuantity}`,
          amount: booking.boosterSeatAmount,
          icon: <IconSeat />,
        });
      }

      const babyQty = booking.babySeatQuantity ?? (booking.hasBabySeat ? 1 : 0);
      if (babyQty > 0) {
        rows.push({
          label: `Siège bébé × ${babyQty}`,
          amount: booking.babySeatAmount,
          icon: <IconSeat />,
        });
      }

      if ((booking.childSeatQuantity ?? 0) > 0) {
        rows.push({
          label: `Siège enfant × ${booking.childSeatQuantity}`,
          amount: booking.childSeatAmount,
          icon: <IconSeat />,
        });
      }

      if (booking.hasProtectionPlus) {
        rows.push({
          label: "Protection Plus",
          amount: booking.protectionPlusAmount,
          icon: <IconShield />,
        });
      }

      return rows;
    }, [booking]);

    if (loading) {
      return (
        <div className="bookings-page-v2">
          <section className="bookings-empty">
            <h3>Chargement de la réservation…</h3>
            <p>Veuillez patienter pendant la récupération des données.</p>
          </section>
        </div>
      );
    }

    if (error || !booking) {
      return (
        <div className="bookings-page-v2">
          <section className="bookings-empty">
            <h3>Réservation introuvable</h3>
            <p>{error || "Cette réservation n'existe pas ou a été supprimée."}</p>
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-neutral"
                onClick={() => navigate("/admin/bookings")}
              >
                Retour aux réservations
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
            <span className="bookings-kicker">Gestion Réservation</span>
            <h1>
              {booking.firstName} {booking.lastName}
            </h1>
            <p>
              Consultez tous les détails de cette réservation, les options choisies,
              le suivi du paiement et les informations du véhicule.
            </p>

            <div className="bdp-hero-top__meta" style={{ marginTop: 14 }}>
              <span className="bdp-hero-top__meta-pill">
                <span className="bdp-inline-icon"><IconCar /></span>
                {getVehicleLabel(booking)}
              </span>

              <span className={`bdp-hero-top__status bdp-hero-top__status--${normalizedStatus}`}>
                {getStatusLabel(booking.status)}
              </span>

              <span className="bdp-hero-top__meta-pill">
                #{booking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="bookings-header-right">
             <Link to="/admin/bookings" className="btn-neutral" style={{ textDecoration: 'none' }}>
                Retour
              </Link>

              <div className="bookings-highlight-card">
                <span>Durée</span>
                <strong>{booking.totalDays ?? 0} j</strong>
              </div>
          </div>
        </section>

        {actionError && (
          <div className="bookings-alert" style={{ marginBottom: 14 }}>
            <div className="bookings-alert-mark">!</div>
            <div>
              <strong>Action impossible</strong>
              <p>{actionError}</p>
            </div>
            <button type="button" onClick={() => setActionError("")}>×</button>
          </div>
        )}

          <section className="bdp-hero">
            <div className="bdp-vehicle-card">
              <div className="bdp-vehicle-media">
                {hasPromo && <span className="bdp-promo-pill">Offre / Promo active</span>}

                {!imageFailed && vehicleImageSrc ? (
                  <img
                    src={vehicleImageSrc}
                    alt={getVehicleLabel(booking)}
                    className="bdp-vehicle-img"
                    onError={() => {
                      setImageFailed(true);
                    }}
                  />
                ) : (
                  <div className="bdp-vehicle-fallback">
                    <span className="bdp-vehicle-fallback__icon">
                      <IconCar />
                    </span>
                    <strong>{getVehicleLabel(booking)}</strong>
                    <span>Image indisponible</span>
                  </div>
                )}
              </div>

              <div className="bdp-vehicle-body">
                <div className="bdp-vehicle-header">
                  <div>
                    <h2 className="bdp-vehicle-name">{getVehicleLabel(booking)}</h2>
                    <p className="bdp-vehicle-cat">
                      {booking.vehicle?.category?.name || "Catégorie non renseignée"}
                    </p>
                  </div>

                  <div className="bdp-tags">
                    {activeOptionTags.map((tag) => (
                      <span key={tag} className="bdp-tag">
                        {tag}
                      </span>
                    ))}

                    {hasPromo && (
                      <span className="bdp-tag bdp-tag--promo">
                        {booking.promoCodeUsed || "Réduction"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="bdp-stats">
                  <div className="bdp-stat">
                    <span className="bdp-stat-icon"><IconCalendar /></span>
                    <span className="bdp-stat-label">Départ</span>
                    <span className="bdp-stat-value">{formatDate(booking.startDate)}</span>
                  </div>

                  <div className="bdp-stat">
                    <span className="bdp-stat-icon"><IconCalendar /></span>
                    <span className="bdp-stat-label">Retour</span>
                    <span className="bdp-stat-value">{formatDate(booking.endDate)}</span>
                  </div>

                  <div className="bdp-stat">
                    <span className="bdp-stat-icon"><IconCar /></span>
                    <span className="bdp-stat-label">Durée</span>
                    <span className="bdp-stat-value">{booking.totalDays ?? "—"} j</span>
                  </div>

                  <div className="bdp-stat">
                    <span className="bdp-stat-icon"><IconDollar /></span>
                    <span className="bdp-stat-label">Total</span>
                    <span className="bdp-stat-value">{formatPrice(booking.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bdp-pay-card">
              <div className="bdp-pay-header">
                <span className="bdp-pay-header-label">Paiement</span>
                <span className={getPaymentStateClass(booking)}>
                  {getPaymentStateLabel(booking)}
                </span>
              </div>

              <div className="bdp-pay-total">
                <span className="bdp-pay-total-label">Total réservation</span>
                <span className="bdp-pay-total-amount">{formatPrice(booking.totalPrice)}</span>
              </div>

              <div className="bdp-pay-progress">
                <div className="bdp-pay-progress-row">
                  <span>Acompte versé</span>
                  <strong>{formatPrice(booking.depositAmount)}</strong>
                </div>

                <div className="bdp-pay-progress-bar">
                  <div className={getProgressFillClass(booking)} style={{ width: getProgressWidth(booking) }} />
                </div>

                <div className="bdp-pay-progress-row">
                  <span>Reste à payer</span>
                  <strong>{formatPrice(getRemainingAmount(booking))}</strong>
                </div>
              </div>

              <div className="bdp-pay-footer">
                <div className="bdp-pay-footer-row">
                  <span>Date acompte</span>
                  <strong>{formatDateTime(booking.depositPaidAt)}</strong>
                </div>
                <div className="bdp-pay-footer-row">
                  <span>Date solde</span>
                  <strong>{formatDateTime(booking.fullyPaidAt)}</strong>
                </div>
                <div className="bdp-pay-footer-row">
                  <span>Créée le</span>
                  <strong>{formatDateTime(booking.createdAt)}</strong>
                </div>
                <div className="bdp-pay-footer-row">
                  <span>Mise à jour</span>
                  <strong>{formatDateTime(booking.updatedAt)}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="bdp-timeline-card">
            <div className="bdp-section-head">
              <div>
                <h3>Cycle de vie</h3>
                <p>Suivi du déroulement de la réservation</p>
              </div>
            </div>

            <div className="bdp-timeline">
              <TlItem done label="Créée" sub={formatDateTime(booking.createdAt)} />
              <TlItem
                done={normalizedStatus === "confirmed" || normalizedStatus === "cancelled"}
                current={normalizedStatus === "pending"}
                label="Statut"
                sub={getStatusLabel(booking.status)}
              />
              <TlItem
                done={!!booking.isDepositPaid}
                label="Acompte"
                sub={booking.isDepositPaid ? `Payé le ${formatDateTime(booking.depositPaidAt)}` : "En attente"}
              />
              <TlItem
                done={!!booking.isFullyPaid}
                label="Solde final"
                sub={booking.isFullyPaid ? `Soldée le ${formatDateTime(booking.fullyPaidAt)}` : "Non soldée"}
              />
            </div>
          </section>

          <div className="bdp-detail-grid">
            <section className="bdp-card">
              <div className="bdp-card-head">
                <div className="bdp-card-icon bdp-card-icon--blue"><IconUser /></div>
                <div>
                  <h3 className="bdp-card-title">Client</h3>
                  <p className="bdp-card-subtitle">Informations personnelles du client</p>
                </div>
              </div>

              <div className="bdp-detail-list">
                <DetailRow icon={<IconUser />} label="Nom complet">
                  {booking.firstName} {booking.lastName}
                </DetailRow>
                <DetailRow icon={<IconMail />} label="Email">
                  {booking.email || "—"}
                </DetailRow>
                <DetailRow icon={<IconPhone />} label="Téléphone">
                  {booking.phone || "—"}
                </DetailRow>
                <DetailRow icon={<IconUser />} label="Âge">
                  {booking.age ? `${booking.age} ans` : "—"}
                </DetailRow>
              </div>
            </section>

            <section className="bdp-card">
              <div className="bdp-card-head">
                <div className="bdp-card-icon bdp-card-icon--green"><IconCar /></div>
                <div>
                  <h3 className="bdp-card-title">Réservation</h3>
                  <p className="bdp-card-subtitle">Dates, véhicule et trajets</p>
                </div>
              </div>

              <div className="bdp-detail-list">
                <DetailRow icon={<IconReceipt />} label="ID réservation">{booking.id}</DetailRow>
                <DetailRow icon={<IconCar />} label="Véhicule">{getVehicleLabel(booking)}</DetailRow>
                <DetailRow icon={<IconCar />} label="Catégorie">{booking.vehicle?.category?.name || "—"}</DetailRow>
                <DetailRow icon={<IconMapPin />} label="Prise en charge">{booking.pickupCity?.name || "—"}</DetailRow>
                <DetailRow icon={<IconMapPin />} label="Retour">{booking.returnCity?.name || "—"}</DetailRow>
                <DetailRow icon={<IconCalendar />} label="Date début">{formatDate(booking.startDate)}</DetailRow>
                <DetailRow icon={<IconCalendar />} label="Date fin">{formatDate(booking.endDate)}</DetailRow>
                <DetailRow icon={<IconCar />} label="Durée">{booking.totalDays ? `${booking.totalDays} jours` : "—"}</DetailRow>
              </div>
            </section>

            <section className="bdp-card">
              <div className="bdp-card-head">
                <div className="bdp-card-icon bdp-card-icon--orange"><IconSliders /></div>
                <div>
                  <h3 className="bdp-card-title">Options & Conducteurs</h3>
                  <p className="bdp-card-subtitle">Services et suppléments choisis</p>
                </div>
              </div>

              <div className="bdp-detail-list">
                <DetailRow icon={<IconUser />} label="2e conducteur">
                  {booking.hasSecondDriver ? "✓ Oui" : "Non"}
                </DetailRow>

                {booking.hasSecondDriver && (
                  <>
                    <DetailRow icon={<IconUser />} label="Prénom conducteur 2">{booking.secondDriverFirstName || "—"}</DetailRow>
                    <DetailRow icon={<IconUser />} label="Nom conducteur 2">{booking.secondDriverLastName || "—"}</DetailRow>
                    <DetailRow icon={<IconPhone />} label="Téléphone conducteur 2">{booking.secondDriverPhone || "—"}</DetailRow>
                    <DetailRow icon={<IconDollar />} label="Supplément conducteur 2">{formatPrice(booking.secondDriverAmount)}</DetailRow>
                  </>
                )}

                <DetailRow icon={<IconGps />} label="GPS">{booking.hasGps ? "✓ Oui" : "Non"}</DetailRow>
                {booking.hasGps && <DetailRow icon={<IconDollar />} label="Supplément GPS">{formatPrice(booking.gpsAmount)}</DetailRow>}

                <DetailRow icon={<IconFuel />} label="Plein essence">{booking.hasFullTank ? "✓ Oui" : "Non"}</DetailRow>
                {booking.hasFullTank && <DetailRow icon={<IconDollar />} label="Supplément plein">{formatPrice(booking.fullTankAmount)}</DetailRow>}

                <DetailRow icon={<IconShield />} label="Protection Plus">
                  {booking.hasProtectionPlus ? "✓ Oui" : "Non"}
                </DetailRow>
                {booking.hasProtectionPlus && (
                  <DetailRow icon={<IconDollar />} label="Supplément Protection Plus">
                    {formatPrice(booking.protectionPlusAmount)}
                  </DetailRow>
                )}

                <DetailRow icon={<IconSeat />} label="Rehausseur">
                  {booking.boosterSeatQuantity ?? 0}
                </DetailRow>
                {(booking.boosterSeatQuantity ?? 0) > 0 && (
                  <DetailRow icon={<IconDollar />} label="Montant rehausseur">
                    {formatPrice(booking.boosterSeatAmount)}
                  </DetailRow>
                )}

                <DetailRow icon={<IconSeat />} label="Siège bébé">
                  {booking.babySeatQuantity ?? (booking.hasBabySeat ? 1 : 0)}
                </DetailRow>
                {(booking.babySeatQuantity ?? (booking.hasBabySeat ? 1 : 0)) > 0 && (
                  <DetailRow icon={<IconDollar />} label="Montant siège bébé">
                    {formatPrice(booking.babySeatAmount)}
                  </DetailRow>
                )}

                <DetailRow icon={<IconSeat />} label="Siège enfant">
                  {booking.childSeatQuantity ?? 0}
                </DetailRow>
                {(booking.childSeatQuantity ?? 0) > 0 && (
                  <DetailRow icon={<IconDollar />} label="Montant siège enfant">
                    {formatPrice(booking.childSeatAmount)}
                  </DetailRow>
                )}
              </div>
            </section>

            <section className="bdp-card">
              <div className="bdp-card-head">
                <div className="bdp-card-icon bdp-card-icon--purple"><IconReceipt /></div>
                <div>
                  <h3 className="bdp-card-title">Montants</h3>
                  <p className="bdp-card-subtitle">Résumé financier de la réservation</p>
                </div>
              </div>

              <div className="bdp-price-stack">
                <div className="bdp-price-main">
                  <span>Total à payer</span>
                  <strong>{formatPrice(booking.totalPrice)}</strong>
                </div>

                <div className="bdp-detail-list">
                  <DetailRow icon={<IconReceipt />} label="Prix initial">
                    {formatPrice(booking.originalPrice)}
                  </DetailRow>

                  {optionsAmounts.map((row) => (
                    <DetailRow key={row.label} icon={row.icon} label={row.label}>
                      {formatPrice(row.amount)}
                    </DetailRow>
                  ))}

                  <DetailRow icon={<IconDollar />} label="Réduction">
                    {formatPrice(booking.discountAmount)}
                  </DetailRow>

                  <DetailRow icon={<IconReceipt />} label="Code promo">
                    {booking.promoCodeUsed ? (
                      <span className="bdp-promo-inline">{booking.promoCodeUsed}</span>
                    ) : (
                      "Aucun"
                    )}
                  </DetailRow>

                  <DetailRow icon={<IconDollar />} label="Total final">
                    {formatPrice(booking.totalPrice)}
                  </DetailRow>
                  <DetailRow icon={<IconDollar />} label="Acompte">
                    {formatPrice(booking.depositAmount)}
                  </DetailRow>
                  <DetailRow icon={<IconDollar />} label="Reste à payer">
                    {formatPrice(getRemainingAmount(booking))}
                  </DetailRow>
                </div>
              </div>
            </section>
          </div>

          <section className="bdp-payments-card">
            <div className="bdp-section-head">
              <div>
                <h3>Historique des paiements</h3>
                <p>Tous les paiements liés à cette réservation</p>
              </div>
            </div>

            {booking.payments && booking.payments.length > 0 ? (
              <div className="bdp-payments-table">
                {booking.payments.map((payment, index) => (
                  <div className="bdp-pay-row" key={payment.id || index}>
                    <div className="bdp-pay-row__col">
                      <span className="bdp-pay-cell-label">Type</span>
                      <span className="bdp-pay-cell-value">{payment.type || "—"}</span>
                    </div>
                    <div className="bdp-pay-row__col">
                      <span className="bdp-pay-cell-label">Statut</span>
                      <span className="bdp-pay-cell-value">{payment.status || "—"}</span>
                    </div>
                    <div className="bdp-pay-row__col">
                      <span className="bdp-pay-cell-label">Montant</span>
                      <span className="bdp-pay-cell-value">{formatPrice(payment.amount)}</span>
                    </div>
                    <div className="bdp-pay-row__col">
                      <span className="bdp-pay-cell-label">Provider</span>
                      <span className="bdp-pay-cell-value">{payment.provider || "—"}</span>
                    </div>
                    <div className="bdp-pay-row__col">
                      <span className="bdp-pay-cell-label">Payé le</span>
                      <span className="bdp-pay-cell-value">{formatDateTime(payment.paidAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bdp-empty">
                <span className="bdp-empty__icon"><IconCreditCard /></span>
                <p>Aucun paiement enregistré pour cette réservation.</p>
              </div>
            )}
          </section>

          <div className="bdp-actions">
            <span className="bdp-actions-label">Actions :</span>

            {normalizedStatus === "pending" && (
              <button
                type="button"
                className="bdp-btn bdp-btn--confirm"
                disabled={actionLoading}
                onClick={() =>
                  openConfirm({
                    title: "Confirmer la réservation",
                    message: "Voulez-vous vraiment confirmer cette réservation ?",
                    confirmLabel: "Oui, confirmer",
                    action: () => void updateBookingStatus(2),
                  })
                }
              >
                <span className="bdp-btn__icon"><IconCheck /></span>
                {actionLoading ? "Traitement…" : "Confirmer la réservation"}
              </button>
            )}

            {normalizedStatus !== "cancelled" && (
              <button
                type="button"
                className="bdp-btn bdp-btn--cancel"
                disabled={actionLoading}
                onClick={() =>
                  openConfirm({
                    title: "Annuler la réservation",
                    message: "Voulez-vous vraiment annuler cette réservation ?",
                    confirmLabel: "Oui, annuler",
                    action: () => void updateBookingStatus(3),
                  })
                }
              >
                <span className="bdp-btn__icon"><IconX /></span>
                {actionLoading ? "Traitement…" : "Annuler la réservation"}
              </button>
            )}

            {canMarkFullyPaid && (
              <button
                type="button"
                className="bdp-btn bdp-btn--paid"
                disabled={actionLoading}
                onClick={() =>
                  openConfirm({
                    title: "Marquer comme soldée",
                    message: "Voulez-vous vraiment marquer cette réservation comme soldée ?",
                    confirmLabel: "Oui, marquer soldée",
                    action: () => void markFullyPaid(),
                  })
                }
              >
                <span className="bdp-btn__icon"><IconDollar /></span>
                {actionLoading ? "Traitement…" : "Marquer comme soldée"}
              </button>
            )}
          </div>

          <ConfirmModal
            open={!!confirmAction}
            title={confirmAction?.title}
            message={confirmAction?.message ?? ""}
            confirmLabel={confirmAction?.confirmLabel ?? "Confirmer"}
            cancelLabel="Annuler"
            onConfirm={() => {
              confirmAction?.action();
              setConfirmAction(null);
            }}
            onCancel={() => setConfirmAction(null)}
          />
        </div>
      
    );
  }
