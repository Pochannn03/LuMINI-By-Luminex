import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const RequireAuth = ({ allowedRoles }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (user && allowedRoles.includes(user.role)) {
        return <Outlet />;
    }

    if (user) {
        return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }

    // 3. If not logged in at all, send to login
    return <Navigate to="/login" state={{ from: location }} replace />;
}

export default RequireAuth;