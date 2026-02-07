export const isAuthenticated = (req, res, next) => {
    console.log("Logged in User:", req.user);
    if (req.isAuthenticated()) { // Passport.js helper
        return next();
    }
    res.status(401).json({ message: "You must be logged in." });
};

// 2. Check Role
export const hasRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: "Access denied. You do not have permission." 
            });
        }
        next();
    };
};

/* THIS IS AN EXAMPLE FOR IMPLEMENTING THE GATE/AUTHORIZATION ON BACKEND

import { isAuthenticated, hasRole } from '../middleware/authMiddleware.js';

// PUBLIC (No gates)
router.post('/api/auth', ...);

// PROTECTED: Only Logged In Users
router.get('/api/profile', isAuthenticated, ...);

// PROTECTED: Only Admins can create teachers
router.post('/api/createTeacher', 
    isAuthenticated, 
    hasRole('superadmin', 'admin'), // <--- The Gate
    upload.single('profile_photo'),
    // ... validation ...
    createTeacherController
);

// PROTECTED: Only SuperAdmin can delete users
router.delete('/api/deleteUser/:id', 
    isAuthenticated, 
    hasRole('superadmin'), 
    deleteUserController
);

*/
