import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

// Add 'allowedTypes' as a new prop
const RequireAuth = ({ allowedRoles, allowedTypes }) => {
    const { user } = useAuth();
    const location = useLocation();

    // 1. If not logged in at all -> Login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Check Main Role (e.g., "user", "admin")
    const hasRole = allowedRoles.includes(user.role);

    // 3. Check Sub-Role/Type (e.g., "Parent", "Guardian")
    // If 'allowedTypes' is passed, we check it. If NOT passed, we ignore this check (allow all).
    const hasType = allowedTypes 
        ? allowedTypes.includes(user.relationship) 
        : true; 

    // 4. Success Condition: Must have valid Role AND valid Type
    if (hasRole && hasType) {
        return <Outlet />;
    }

    // 5. If logged in but wrong role/type -> Unauthorized
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
}

export default RequireAuth;