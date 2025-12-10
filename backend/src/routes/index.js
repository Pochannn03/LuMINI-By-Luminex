import { Router } from "express";
import userRouter from "./parentUsers.js";

const router = Router();

router.use(userRouter);

export default router;