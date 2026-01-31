import { Router } from "express";
import authRoutes from "./auth.js";
import teacherRoutes from "./teachers.js"
import parentRoutes from "./parents.js";
import guardianRoutes from "./guardians.js";
import classesRoutes from "./classManage.js";


const router = Router();

router.use(authRoutes);
router.use(teacherRoutes);
router.use(parentRoutes);
router.use(guardianRoutes);
router.use(classesRoutes);


export default router;