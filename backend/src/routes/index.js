import { Router } from "express";
import userRouter from "./parentUsers.js";
import authRouter from "./auth.js";

const router = Router();

router.use(userRouter);
router.use(authRouter);

export default router;