import { Router } from "express";
import { requireAuth, signToken } from "../middlewares/requireAuth";

const router = Router();

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Returns: { token: string }
 */
router.post("/auth/login", (req, res): void => {
  const { username, password } = req.body as { username?: string; password?: string };

  const expectedUsername = process.env["AUTH_USERNAME"];
  const expectedPassword = process.env["AUTH_PASSWORD"];

  if (!expectedUsername || !expectedPassword) {
    req.log.error("AUTH_USERNAME or AUTH_PASSWORD not set in environment");
    res.status(500).json({ error: "Server auth not configured" });
    return;
  }

  if (
    !username ||
    !password ||
    username.trim() !== expectedUsername ||
    password !== expectedPassword
  ) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = signToken(username.trim());
  res.json({ token });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's basic info.
 */
router.get("/auth/me", requireAuth(), (req, res): void => {
  res.json({
    username: req.authUser!.username,
  });
});

export default router;
