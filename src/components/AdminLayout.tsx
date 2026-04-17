import { Outlet } from "react-router-dom";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import AdminInactivityHandler from "./AdminInactivityHandler";
import "../styles/admin-layout.css";

export default function AdminLayout() {
  return (
    <div className="admin-shell">
      <AdminInactivityHandler />

      <AdminSidebar />

      <div className="admin-main">
        <AdminNavbar />

        <main className="admin-content">
          <div className="admin-content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}