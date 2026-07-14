import { useState, useEffect } from "react";
import { useGetAutoReplySettings, useUpdateAutoReplySettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Clock, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const TIME_OPTIONS = [
  { label: "Pagi", value: "Pagi" },
  { label: "Siang", value: "Siang" },
  { label: "Sore", value: "Sore" },
  { label: "Malam", value: "Malam" },
];

export default function AutoReplySettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetAutoReplySettings();
  const updateSettings = useUpdateAutoReplySettings();

  const [isEnabled, setIsEnabled] = useState(false);
  const [cooldownMinutes, setCooldownMinutes] = useState(1440);
  const [templates, setTemplates] = useState(["", "", "", "", ""]);

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled ?? false);
      setCooldownMinutes(settings.cooldownMinutes ?? 1440);
      setTemplates([
        settings.greetingTemplate1 ?? "",
        settings.greetingTemplate2 ?? "",
        settings.greetingTemplate3 ?? "",
        settings.greetingTemplate4 ?? "",
        settings.greetingTemplate5 ?? "",
      ]);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        data: {
          isEnabled,
          cooldownMinutes,
          greetingTemplate1: templates[0] ?? "",
          greetingTemplate2: templates[1] ?? "",
          greetingTemplate3: templates[2] ?? "",
          greetingTemplate4: templates[3] ?? "",
          greetingTemplate5: templates[4] ?? "",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/auto-reply/settings"] });
          toast({ title: "Saved", description: "Auto-reply settings updated successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        },
      }
    );
  };

  const updateTemplate = (index: number, value: string) => {
    setTemplates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Auto Reply</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Configure automatic greeting responses for new conversations</p>
        </div>
        <Button className="gap-2" size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">{updateSettings.isPending ? "Saving..." : "Save"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Auto Reply Settings
            </CardTitle>
            <CardDescription>
              Automatically send greeting messages when customers message outside agent response windows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable Auto Reply</Label>
                <p className="text-xs text-muted-foreground">Turn on automatic greeting responses</p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Cooldown Period (minutes)</Label>
              <p className="text-xs text-muted-foreground mb-2">Wait this long after the last agent reply before auto-replying again</p>
              <Input
                type="number"
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(parseInt(e.target.value) || 1440)}
                min={60}
                max={10080}
              />
              <p className="text-xs text-muted-foreground">
                Current: {cooldownMinutes >= 1440 ? `${Math.floor(cooldownMinutes / 1440)} day(s)` : `${cooldownMinutes} minute(s)`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time-Based Greetings
            </CardTitle>
            <CardDescription>
              Greetings change based on the time of day (WIB/GMT+7)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TIME_OPTIONS.map(({ label, value }) => {
              const now = new Date();
              const hours = now.getHours();
              let isActive = false;
              if (value === "Pagi" && hours >= 5 && hours < 12) isActive = true;
              if (value === "Siang" && hours >= 12 && hours < 15) isActive = true;
              if (value === "Sore" && hours >= 15 && hours < 18) isActive = true;
              if (value === "Malam" && (hours >= 18 || hours < 5)) isActive = true;

              return (
                <div key={value} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {value === "Pagi" && "05:00 - 11:59"}
                      {value === "Siang" && "12:00 - 14:59"}
                      {value === "Sore" && "15:00 - 17:59"}
                      {value === "Malam" && "18:00 - 04:59"}
                    </span>
                  </div>
                  {isActive && <span className="text-xs text-green-600 font-medium">Now</span>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <Card className="shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Greeting Templates</CardTitle>
          <CardDescription>
            One template is randomly selected for each auto-reply. Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{time}"}</code> for time greeting (Pagi/Siang/Sore/Malam) and <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{name}"}</code> for customer name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((template, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium">Template {index + 1}</Label>
              <Textarea
                value={template}
                onChange={(e) => updateTemplate(index, e.target.value)}
                placeholder={`Template ${index + 1}...`}
                rows={3}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
