import { Router } from "express";
import authRouter from "./auth.js";
import teacherRouter from "./teacherAdmin.js"
import parentRouter from "./parentUser.js";
import guardianRouter from "./guardianUser.js";

const router = Router();

router.use(authRouter);
router.use(teacherRouter);
router.use(parentRouter);
router.use(guardianRouter);

export default router;