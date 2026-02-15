import { Router } from "express";
import authRoutes from "./auth.js";
import teacherRoutes from "./teachers.js"
import parentRoutes from "./parents.js";
import guardianRoutes from "./guardians.js";
import studentRoutes from "./students.js";
import classesRoutes from "./classes.js";
import usersRoutes from "./users.js";
import passesRoutes from "./passes.js";
import transferHistoryRoutes from "./transferHistory.js";


const router = Router();

router.use(authRoutes);
router.use(teacherRoutes);
router.use(parentRoutes);
router.use(guardianRoutes);
router.use(studentRoutes);
router.use(classesRoutes);
router.use(usersRoutes);
router.use(passesRoutes);
router.use(transferHistoryRoutes)



export default router;