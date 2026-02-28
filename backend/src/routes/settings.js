import { Router } from "express";
import { hasRole, isAuthenticated } from "../middleware/authMiddleware.js";
import { Student } from "../models/students.js";
import { Section } from "../models/sections.js";
import { Attendance } from "../models/attendances.js";
import { Audit } from "../models/audits.js";
import { Transfer } from "../models/transfers.js";
import { Queue } from "../models/queues.js";

const router = Router();


export default router;