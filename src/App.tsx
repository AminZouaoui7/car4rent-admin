import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SessionExpiredPage from "./pages/SessionExpiredPage";
import DashboardPage from "./pages/DashboardPage";
import VehiclesPage from "./pages/VehiclesPage";
import TariffsPage from "./pages/TariffsPage";
import PricingRulesPage from "./pages/PricingRulesPage";
import BookingsPage from "./pages/BookingsPage";
import BookingDetailPage from "./pages/BookingDetailPage";
import LongTermBookingsPage from "./pages/LongTermBookingsPage";
import LongTermBookingDetailPage from "./pages/LongTermBookingDetailPage";
import PromoCodesPage from "./pages/PromoCodesPage";
import LocationsCategoriesPage from "./pages/LocationsCategoriesPage";
import TransfersPage from "./pages/TransfersPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/session-expired" element={<SessionExpiredPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="tariffs" element={<TariffsPage />} />
        <Route path="pricing-rules" element={<PricingRulesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="long-term-bookings" element={<LongTermBookingsPage />} />
        <Route
          path="long-term-bookings/:id"
          element={<LongTermBookingDetailPage />}
        />
        <Route path="promo-codes" element={<PromoCodesPage />} />
        <Route path="locations-categories" element={<LocationsCategoriesPage />} />
        <Route path="transfers" element={<TransfersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}