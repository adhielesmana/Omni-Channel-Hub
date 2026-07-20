import { useState, useEffect } from "react";
import { useGetAiAgentsSettings, useUpdateAiAgentsSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Clock, Key, Save, RotateCcw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

export default function AiAgentsSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetAiAgentsSettings();
  const updateSettings = useUpdateAiAgentsSettings();

  const [isEnabled, setIsEnabled] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(60);
  const [lookbackHours, setLookbackHours] = useState(24);
  const [apiKey, setApiKey] = useState("");
  const [aiModel, setAiModel] = useState("deepseek-v4-flash");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyCooldownMinutes, setAutoReplyCooldownMinutes] = useState(1440);
  const [autoReplyPrompt, setAutoReplyPrompt] = useState("");

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled ?? false);
      setIdleMinutes(settings.idleMinutes ?? 60);
      setLookbackHours(settings.lookbackHours ?? 24);
      setApiKey(settings.apiKey ?? "");
      setAiModel(settings.model ?? "deepseek-v4-flash");
      setSystemPrompt(settings.systemPrompt ?? "");
      setAutoReplyEnabled(settings.autoReplyEnabled ?? false);
      setAutoReplyCooldownMinutes(settings.autoReplyCooldownMinutes ?? 1440);
      setAutoReplyPrompt(settings.autoReplyPrompt ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        data: {
          isEnabled,
          idleMinutes,
          lookbackHours,
          apiKey: apiKey.trim() || undefined,
          model: aiModel.trim() || "deepseek-v4-flash",
          systemPrompt: systemPrompt.trim() || undefined,
          autoReplyEnabled,
          autoReplyCooldownMinutes,
          autoReplyPrompt: autoReplyPrompt.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/ai-agents/settings"] });
          toast({ title: "Saved", description: "AI agents settings updated successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        },
      }
    );
  };

  const handleReset = () => {
    const defaultPrompt = [
      "Anda adalah asisten customer service untuk penyedia layanan internet MaxnetPlus.",
      "Analisis percakapan berikut dan tentukan tindakan yang tepat.",
      "",
      "PENTING: Hanya output JSON tanpa teks lain, tanpa markdown, tanpa backticks.",
      "",
      'Kembalikan JSON:',
      '{"analysis": "string", "sentiment": "positive"|"negative"|"neutral", "action": "respond_empathy"|"respond_payment"|"note_only", "team": "support"|"finance"|null, "response": "string"}',
      "",
      "Aturan:",
      "1. Jika pelanggan komplain tentang internet/kualitas — action: respond_empathy, team: support. Balas empati dalam Bahasa Indonesia, minta maaf, koordinasikan dengan tim support. Jangan seperti bot.",
      "2. Jika pelanggan kirim bukti bayar/invoice/transfer — action: respond_payment, team: finance. Balas terima kasih, akan diteruskan ke tim finance.",
      "3. Jika hanya salam/sapaan tanpa masalah jelas — action: note_only, response: kosong. Catat analisis.",
      "4. Jika tidak yakin — action: note_only, response: kosong.",
      "5. Sentiment: negative jika komplain/marah, positive jika terima kasih/konfirmasi bayar, neutral untuk lainnya.",
    ].join("\n");
    setSystemPrompt(defaultPrompt);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 h-full overflow-y-auto">
        <div className="text-center p-12 text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Automatically analyze and respond to idle conversations using AI</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset Prompt</span>
          </Button>
          <Button className="gap-2" size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{updateSettings.isPending ? "Saving..." : "Save"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Agent Settings
            </CardTitle>
            <CardDescription>
              Monitor idle conversations and let AI analyze & respond automatically when no agent has replied.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable AI Agents</Label>
                <p className="text-xs text-muted-foreground">Turn on automatic AI analysis and responses</p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Idle Timeout (minutes)</Label>
              <p className="text-xs text-muted-foreground mb-2">Wait this long after the last customer message before AI analysis</p>
              <Input
                type="number"
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(parseInt(e.target.value) || 60)}
                min={5}
                max={1440}
              />
              <p className="text-xs text-muted-foreground">
                AI will analyze conversations idle for {idleMinutes >= 60 ? `${Math.floor(idleMinutes / 60)} hour(s)` : `${idleMinutes} minute(s)`}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Lookback Window (hours)</Label>
              <p className="text-xs text-muted-foreground mb-2">How far back to read messages for context</p>
              <Input
                type="number"
                value={lookbackHours}
                onChange={(e) => setLookbackHours(parseInt(e.target.value) || 24)}
                min={1}
                max={168}
              />
              <p className="text-xs text-muted-foreground">
                Analyzes last {lookbackHours} hour(s) of conversation
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">API Key</Label>
              <p className="text-xs text-muted-foreground mb-2">Authentication key for the AI endpoint (required)</p>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="pl-9 font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">AI Model</Label>
              <p className="text-xs text-muted-foreground mb-2">Model name for the AI API (e.g. deepseek-v4-flash, qwen3.7-plus)</p>
              <Input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="deepseek-v4-flash"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              The AI agent runs every 60 seconds to check for conversations that need attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <p className="text-sm font-medium">Trigger Conditions</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Last message is from customer</li>
                <li>No agent response within the idle timeout</li>
                <li>Conversation is not resolved</li>
                <li>AI hasn't already analyzed this conversation</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
              <p className="text-sm font-medium">AI Response Types</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Empathy</strong> — Complaints or quality issues → routed to support team</li>
                <li><strong>Payment</strong> — Payment proof → thanked and routed to finance</li>
                <li><strong>Note Only</strong> — Uncertain cases → internal note without reply</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto Reply Section */}
      <Card className="shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            AI Auto Reply
          </CardTitle>
          <CardDescription>
            When a customer sends their first message, AI generates a contextual greeting instead of a static template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable AI Auto Reply</Label>
              <p className="text-xs text-muted-foreground">Turn on AI-powered instant greetings for new conversations</p>
            </div>
            <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Cooldown (minutes)</Label>
            <p className="text-xs text-muted-foreground mb-2">Wait this long after last agent reply before auto-replying again</p>
            <Input
              type="number"
              value={autoReplyCooldownMinutes}
              onChange={(e) => setAutoReplyCooldownMinutes(parseInt(e.target.value) || 1440)}
              min={60}
              max={10080}
            />
            <p className="text-xs text-muted-foreground">
              {autoReplyCooldownMinutes >= 1440 ? `${Math.floor(autoReplyCooldownMinutes / 1440)} day(s)` : `${autoReplyCooldownMinutes} minute(s)`}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto Reply Prompt</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Instructions for generating the greeting. Must return JSON with <code className="bg-muted px-1 py-0.5 rounded text-xs">response</code> field.
            </p>
            <Textarea
              value={autoReplyPrompt}
              onChange={(e) => setAutoReplyPrompt(e.target.value)}
              placeholder="Auto reply prompt..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card className="shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Analysis System Prompt</CardTitle>
          <CardDescription>
            Instructions for idle conversation analysis. Must return JSON with <code className="bg-muted px-1 py-0.5 rounded text-xs">action</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">analysis</code>, and <code className="bg-muted px-1 py-0.5 rounded text-xs">response</code> fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system prompt for AI agent..."
            rows={12}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
