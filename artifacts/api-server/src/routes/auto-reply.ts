import { Router } from "../lib/http-kit";
import { selectWhere, update, insert } from "@workspace/db";
import type { AutoReplySettings } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/auto-reply/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await selectWhere<AutoReplySettings>("auto_reply_settings", {});
  if (!settings.length) {
    const created = await insert<AutoReplySettings>("auto_reply_settings", { isEnabled: false });
    res.json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
    return;
  }
  const s = settings[0];
  res.json({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  });
});

router.patch("/auto-reply/settings", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const settings = await selectWhere<AutoReplySettings>("auto_reply_settings", {});
  if (!settings.length) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if ("isEnabled" in body) updates.is_enabled = body.isEnabled;
  if ("cooldownMinutes" in body) updates.cooldown_minutes = body.cooldownMinutes;
  if ("greetingTemplate1" in body) updates.greeting_template_1 = body.greetingTemplate1;
  if ("greetingTemplate2" in body) updates.greeting_template_2 = body.greetingTemplate2;
  if ("greetingTemplate3" in body) updates.greeting_template_3 = body.greetingTemplate3;
  if ("greetingTemplate4" in body) updates.greeting_template_4 = body.greetingTemplate4;
  if ("greetingTemplate5" in body) updates.greeting_template_5 = body.greetingTemplate5;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const updated = await update<AutoReplySettings>("auto_reply_settings", settings[0].id, updates);
  if (!updated) {
    res.status(500).json({ error: "Failed to update settings" });
    return;
  }
  res.json({
    ...updated,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export default router;
