import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import AdminInactivityHandler from "./AdminInactivityHandler";
import "../styles/admin-layout.css";
import "../styles/admin-responsive.css";

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("admin-mobile-menu-open", isSidebarOpen);

    return () => {
      document.body.classList.remove("admin-mobile-menu-open");
    };
  }, [isSidebarOpen]);

  return (
    <div className={`admin-shell ${isSidebarOpen ? "admin-shell--sidebar-open" : ""}`}>
      <AdminInactivityHandler />

      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <button
        type="button"
        className="admin-sidebar-overlay"
        aria-label="Fermer le menu"
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className="admin-main">
        <AdminNavbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="admin-content">
          <div className="admin-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
