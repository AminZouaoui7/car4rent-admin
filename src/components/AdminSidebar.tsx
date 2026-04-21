import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import logoCar4Rent from "../assets/logo-car4rent.png";
import { useAdminAlerts } from "../hooks/useAdminAlerts";

export default function AdminSidebar() {
  const location = useLocation();
  const { alerts } = useAdminAlerts();

  const isReservationsSectionActive = useMemo(() => {
    return (
      location.pathname.startsWith("/admin/bookings") ||
      location.pathname.startsWith("/admin/long-term-bookings")
    );
  }, [location.pathname]);

  const [isReservationsOpen, setIsReservationsOpen] = useState(isReservationsSectionActive);

  const badgeClassName = "admin-badge admin-badge--pulse";

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-top">
        <div className="admin-brand">
          <div className="admin-brand-logo-wrap">
            <img src={logoCar4Rent} alt="Car4Rent" className="admin-brand-logo" />
          </div>

          <div className="admin-brand-text">
            <h2>Car4Rent</h2>
            <span>Administration sécurisée</span>
          </div>
        </div>

        <nav className="admin-menu">
          <NavLink to="/admin/dashboard" className="admin-menu-link">
            <span className="menu-icon">◉</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/admin/vehicles" className="admin-menu-link">
            <span className="menu-icon">◈</span>
            <span>Véhicules</span>
          </NavLink>

          <NavLink to="/admin/tariffs" className="admin-menu-link">
            <span className="menu-icon">◌</span>
            <span>Tarifs & saisons</span>
          </NavLink>

          <NavLink to="/admin/pricing-rules" className="admin-menu-link">
            <span className="menu-icon">◍</span>
            <span>Pricing rules</span>
          </NavLink>

          <div className={`admin-menu-group ${isReservationsSectionActive ? "active" : ""}`}>
            <button
              type="button"
              className={`admin-menu-link admin-menu-toggle ${isReservationsSectionActive ? "active" : ""}`}
              onClick={() => setIsReservationsOpen((prev) => !prev)}
            >
              <span
                className="menu-link-main"
                style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}
              >
                <span className="menu-icon">◎</span>
                <span>Réservations</span>

                {alerts.reservationsTotal > 0 && (
                  <span className={badgeClassName}>{alerts.reservationsTotal}</span>
                )}
              </span>

              <span className={`menu-arrow ${isReservationsOpen ? "open" : ""}`}>⌄</span>
            </button>

            {isReservationsOpen && (
              <div className="admin-submenu">
                <NavLink
                  to="/admin/bookings"
                  className="admin-submenu-link"
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span className="menu-icon">•</span>
                  <span>Réservations simples</span>

                  {alerts.bookingsCount > 0 && (
                    <span className={badgeClassName}>{alerts.bookingsCount}</span>
                  )}
                </NavLink>

                <NavLink
                  to="/admin/long-term-bookings"
                  className="admin-submenu-link"
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span className="menu-icon">•</span>
                  <span>Réservations longue durée</span>

                  {alerts.longTermCount > 0 && (
                    <span className={badgeClassName}>{alerts.longTermCount}</span>
                  )}
                </NavLink>
              </div>
            )}
          </div>

          <NavLink
            to="/admin/transfers"
            className="admin-menu-link"
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            <span className="menu-icon">⇄</span>
            <span>Transferts</span>

            {alerts.transfersCount > 0 && (
              <span className={badgeClassName}>{alerts.transfersCount}</span>
            )}
          </NavLink>

          <NavLink to="/admin/promo-codes" className="admin-menu-link">
            <span className="menu-icon">⬢</span>
            <span>Codes promo</span>
          </NavLink>

          <NavLink to="/admin/locations-categories" className="admin-menu-link">
            <span className="menu-icon">⌂</span>
            <span>Villes & catégories</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}