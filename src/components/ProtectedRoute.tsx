import { Navigate } from "react-router-dom";
import { isAdminAuthenticated } from "../services/authService";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const isAuthenticated = isAdminAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}