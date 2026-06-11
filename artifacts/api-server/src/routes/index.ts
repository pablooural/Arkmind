import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import healthRouter from "./health";
import authRouter from "./auth";
import aiRouter from "./ai";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Rate limiters
// ---------------------------------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 login/register attempts per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, try again later" },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // max 30 AI requests per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many AI requests, try again later" },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

router.use(healthRouter);
router.use("/auth", authLimiter, authRouter);
router.use("/ai", aiLimiter, requireAuth, aiRouter);

export default router;
