import { Router } from "../lib/http-kit";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
