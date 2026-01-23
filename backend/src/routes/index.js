import { Router } from "express";
import authRouter from "./auth.js";
import teacherRouter from "./teacherAdmin.js"
import parentRouter from "./parentUser.js";
import guardianRouter from "./guardianUser.js";
import superAdmin from "./superAdmin.js";


const router = Router();

router.use(authRouter);
router.use(teacherRouter);
router.use(parentRouter);
router.use(guardianRouter);
router.use(superAdmin);


export default router;