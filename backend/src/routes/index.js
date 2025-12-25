import { Router } from "express";
import parentRouter from "./parentUser.js";
import authRouter from "./auth.js";
import guardianRouter from "./guardianUser.js";

const router = Router();

router.use(parentRouter);
router.use(authRouter);
router.use(guardianRouter);

export default router;