import { useState, useEffect } from "react";
import { useGetAiAgentsSettings, useUpdateAiAgentsSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Clock, Save, RotateCcw } from "lucide-react";
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
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled ?? false);
      setIdleMinutes(settings.idleMinutes ?? 60);
      setLookbackHours(settings.lookbackHours ?? 24);
      setSystemPrompt(settings.systemPrompt ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        data: {
          isEnabled,
          idleMinutes,
          lookbackHours,
          systemPrompt: systemPrompt.trim() || undefined,
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
      "Anda adalah asisten customer service untuk penyedia layanan internet MaxnetPlus. Analisis percakapan berikut dan tentukan tindakan yang tepat.",
      "",
      "Kembalikan JSON dengan format:",
      "{",
      '  "analysis": "string — penjelasan singkat tentang isi percakapan",',
      '  "sentiment": "positive" | "negative" | "neutral",',
      '  "action": "respond_empathy" | "respond_payment" | "note_only",',
      '  "team": "support" | "finance" | null,',
      '  "response": "string — balasan yang akan dikirim (kosong jika action=note_only)"',
      "}",
      "",
      "Aturan:",
      "1. Jika pelanggan mengeluh, tidak puas, atau komplain tentang layanan/kualitas internet — action: respond_empathy, team: support. Balas dengan empati dalam Bahasa Indonesia, minta maaf atas ketidaknyamanan, dan informasikan sedang dikoordinasikan dengan tim terkait. Jangan terdengar seperti bot atau template.",
      "2. Jika pelanggan mengirim bukti pembayaran (screenshot/invoice) — action: respond_payment, team: finance. Balas dengan ucapan terima kasih dan informasikan akan diteruskan ke tim finance.",
      "3. Jika tidak yakin atau kondisi tidak jelas — action: note_only, response: kosong. Catat analisis dan alasan tidak merespon.",
      "4. Sentiment negative jika pelanggan marah, kecewa, atau komplain. Positive jika berterima kasih atau konfirmasi pembayaran. Neutral untuk lainnya.",
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

      {/* System Prompt */}
      <Card className="shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
          <CardDescription>
            Instructions given to the AI agent. Must instruct the AI to return JSON with <code className="bg-muted px-1 py-0.5 rounded text-xs">action</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">analysis</code>, and <code className="bg-muted px-1 py-0.5 rounded text-xs">response</code> fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system prompt for AI agent..."
            rows={16}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
