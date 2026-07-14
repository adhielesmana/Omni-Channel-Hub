import { Router } from "../lib/http-kit";
import { selectWhere, update, insert } from "@workspace/db";
import type { AiAgentsSettings } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function mapSettingsResponse(s: AiAgentsSettings) {
  return {
    id: s.id,
    isEnabled: s.isEnabled,
    idleMinutes: s.idleMinutes,
    lookbackHours: s.lookbackHours,
    apiEndpoint: s.apiEndpoint,
    apiKey: (s as any).api_key ?? s.apiKey ?? null,
    model: (s as any).model ?? s.model ?? "deepseek-v4-flash",
    systemPrompt: s.systemPrompt,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/ai-agents/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await selectWhere<AiAgentsSettings>("ai_agents_settings", {});
  if (!settings.length) {
    const created = await insert<AiAgentsSettings>("ai_agents_settings", { isEnabled: false });
    res.json(mapSettingsResponse(created));
    return;
  }
  res.json(mapSettingsResponse(settings[0]));
});

router.patch("/ai-agents/settings", requireAuth, async (req, res): Promise<void> => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const settings = await selectWhere<AiAgentsSettings>("ai_agents_settings", {});
  if (!settings.length) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if ("isEnabled" in body) updates.is_enabled = body.isEnabled;
  if ("idleMinutes" in body) updates.idle_minutes = body.idleMinutes;
  if ("lookbackHours" in body) updates.lookback_hours = body.lookbackHours;
  if ("apiEndpoint" in body) updates.api_endpoint = body.apiEndpoint;
  if ("apiKey" in body) updates.api_key = body.apiKey;
  if ("model" in body) updates.model = body.model;
  if ("systemPrompt" in body) updates.system_prompt = body.systemPrompt;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const updated = await update<AiAgentsSettings>("ai_agents_settings", settings[0].id, updates);
  if (!updated) {
    res.status(500).json({ error: "Failed to update settings" });
    return;
  }
  res.json(mapSettingsResponse(updated));
});

export default router;
