import { Router } from "express";
import authRoutes from "./auth.js";
import teacherRoutes from "./teachers.js"
import parentRoutes from "./parents.js";
import guardianRoutes from "./guardians.js";
import studentRoutes from "./students.js";
import classesRoutes from "./classes.js";
import usersRoutes from "./users.js";
import passesRoutes from "./passes.js";
import attendancesRoutes from "./attendances.js";
import transfersRoutes from "./transfers.js";
import queueRoutes from "./queues.js"
import feedbacksRoutes from "./feedback.js"
import enrollmentRoutes from "./enrollmentRoutes.js";
import announcementsRoutes from "./announcements.js"
import auditsRoutes from "./audits.js";


const router = Router();

router.use(authRoutes);
router.use(teacherRoutes);
router.use(parentRoutes);
router.use(guardianRoutes);
router.use(studentRoutes);
router.use(classesRoutes);
router.use(usersRoutes);
router.use(passesRoutes);
router.use(attendancesRoutes);
router.use(transfersRoutes);
router.use(queueRoutes);
router.use(feedbacksRoutes);
router.use(enrollmentRoutes); 
router.use(announcementsRoutes);
router.use(auditsRoutes);



export default router;