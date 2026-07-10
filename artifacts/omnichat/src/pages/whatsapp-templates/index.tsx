import { useState } from "react";
import { useListChannels, useListWaTemplates, useCreateWaTemplate, useSyncWaTemplates, useDeleteWaTemplate } from "@workspace/api-client-react";
import type { WaTemplate, CreateWaTemplateInput, WaTemplateComponentInputButtonsItemType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export default function WhatsappTemplatesPage() {
  const [channelId, setChannelId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: channels } = useListChannels({});
  const whatsappChannels = channels?.filter((c) => c.channelType === "whatsapp") ?? [];

  const { data: templates, isLoading } = useListWaTemplates(
    { channelId: Number(channelId) },
    { query: { enabled: !!channelId, queryKey: ["listWaTemplates", channelId] } }
  );

  const createMutation = useCreateWaTemplate();
  const syncMutation = useSyncWaTemplates();
  const deleteMutation = useDeleteWaTemplate();

  const filtered = templates?.filter((t) =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    String(t.id).includes(search)
  );

  const bodyPreview = (t: WaTemplate) => {
    const comps = t.components as Array<{ type?: string; text?: string }> | null | undefined;
    const body = comps?.find((c) => c.type === "BODY");
    return body?.text?.substring(0, 80) ?? "-";
  };

  const statusVariant = (status?: string) => {
    if (status === "APPROVED") return "bg-green-100 text-green-700 border-green-300" as const;
    if (status === "PENDING") return "bg-yellow-100 text-yellow-700 border-yellow-300" as const;
    if (status === "REJECTED") return "bg-red-100 text-red-700 border-red-300" as const;
    return "bg-gray-100 text-gray-700 border-gray-300" as const;
  };

  const handleDelete = (template: WaTemplate) => {
    if (!window.confirm(`Delete template "${template.name}"? This will also delete it from Meta.`)) return;
    deleteMutation.mutate(
      { id: template.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listWaTemplates", channelId] });
          toast({ title: "Template deleted", description: `"${template.name}" deleted from app and Meta.` });
          queryClient.invalidateQueries({ queryKey: ["listWhatsappBlastTemplates", channelId] });
        },
        onError: (err) => {
          toast({ title: "Delete failed", description: (err as { message?: string })?.message ?? "Unknown error", variant: "destructive" });
        },
      }
    );
  };

  const handleSync = () => {
    syncMutation.mutate(
      { data: { channelId: Number(channelId) } },
      {
        onSuccess: (result) => {
          queryClient.invalidateQueries({ queryKey: ["listWaTemplates", channelId] });
          queryClient.invalidateQueries({ queryKey: ["listWhatsappBlastTemplates", channelId] });
          toast({ title: "Sync complete", description: `${result.synced} templates synced from Meta` });
        },
        onError: (err) => {
          toast({ title: "Sync failed", description: (err as { message?: string })?.message ?? "Unknown error", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">WhatsApp Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Manage message templates synced from Meta</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {whatsappChannels.map((ch) => (
                <SelectItem key={ch.id} value={String(ch.id)}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!channelId}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={!channelId} size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <CreateTemplateDialog
              channelId={channelId}
              onSuccess={() => {
                setCreateOpen(false);
                queryClient.invalidateQueries({ queryKey: ["listWaTemplates", channelId] });
                queryClient.invalidateQueries({ queryKey: ["listWhatsappBlastTemplates", channelId] });
                handleSync();
              }}
            />
          </DialogContent>
        </Dialog>
        <Button
          variant="outline"
          size="sm"
          disabled={!channelId || syncMutation.isPending}
          onClick={handleSync}
        >
          {syncMutation.isPending ? <Spinner className="w-4 h-4 mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Sync from Meta
        </Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden flex-1 flex flex-col shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Body Preview</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!channelId ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                  Select a WhatsApp channel to view templates
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">Loading templates...</TableCell>
              </TableRow>
            ) : !filtered || filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                  {search ? `No templates matching "${search}"` : "No templates found. Click Sync from Meta to fetch from Meta."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell>
                    <button
                      type="button"
                      className="font-mono text-sm font-medium text-blue-600 hover:underline cursor-pointer text-left"
                      onClick={() => setSelectedTemplate(t)}
                    >
                      {t.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">{t.language}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">{t.category?.toLowerCase() ?? "-"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusVariant(t.status)}`}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                    {bodyPreview(t)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.channelName}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(t)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={(open) => { if (!open) setSelectedTemplate(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Language</span>
                <p className="font-medium">{selectedTemplate?.language}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category</span>
                <p className="font-medium capitalize">{selectedTemplate?.category?.toLowerCase() ?? "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p><Badge variant="outline" className={`text-xs ${statusVariant(selectedTemplate?.status)}`}>{selectedTemplate?.status}</Badge></p>
              </div>
              <div>
                <span className="text-muted-foreground">Channel</span>
                <p className="font-medium">{selectedTemplate?.channelName}</p>
              </div>
              {selectedTemplate?.rejectReason && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Rejection reason</span>
                  <p className="text-sm text-red-600 mt-1">{selectedTemplate.rejectReason}</p>
                </div>
              )}
              {selectedTemplate?.lastSyncedAt && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Last synced</span>
                  <p className="text-sm">{new Date(selectedTemplate.lastSyncedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            {(() => {
              const comps = selectedTemplate?.components as Array<{ type?: string; text?: string; format?: string; buttons?: Array<Record<string, unknown>> }> | null | undefined;
              if (!comps) return null;
              return comps.map((comp, ci) => {
                if (comp.type === "HEADER") {
                  return (
                    <div key={ci}>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header</span>
                      <p className="text-sm mt-1 bg-muted/50 rounded-md p-3">{comp.text ?? comp.format ?? "-"}</p>
                    </div>
                  );
                }
                if (comp.type === "BODY") {
                  return (
                    <div key={ci}>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body</span>
                      <p className="text-sm mt-1 bg-muted/50 rounded-md p-3 whitespace-pre-wrap leading-relaxed">{comp.text ?? "-"}</p>
                    </div>
                  );
                }
                if (comp.type === "FOOTER") {
                  return (
                    <div key={ci}>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Footer</span>
                      <p className="text-sm mt-1 text-muted-foreground">{comp.text ?? "-"}</p>
                    </div>
                  );
                }
                if (comp.type === "BUTTONS" && Array.isArray(comp.buttons)) {
                  return (
                    <div key={ci}>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buttons</span>
                      <div className="mt-1 space-y-1">
                        {comp.buttons.map((btn, bi) => (
                          <div key={bi} className="text-sm bg-muted/50 rounded-md px-3 py-2">
                            {btn.text as string ?? btn.type as string}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateTemplateDialog({ channelId, onSuccess }: { channelId: string; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [bodyText, setBodyText] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<Array<{ type: WaTemplateComponentInputButtonsItemType; text: string; url?: string; phoneNumber?: string }>>([]);
  const [adding, setAdding] = useState(false);

  const createMutation = useCreateWaTemplate();
  const queryClient = useQueryClient();

  const addButton = (type: WaTemplateComponentInputButtonsItemType) => {
    const text = type === "QUICK_REPLY" ? `Button ${buttons.length + 1}` : "";
    const url = type === "URL" ? "https://" : undefined;
    const phoneNumber = type === "PHONE_NUMBER" ? "+1" : undefined;
    setButtons([...buttons, { type, text, url, phoneNumber }]);
  };

  const updateButton = (i: number, field: string, value: string) => {
    const next = [...buttons];
    (next[i] as Record<string, unknown>)[field] = value;
    setButtons(next);
  };

  const removeButton = (i: number) => {
    setButtons(buttons.filter((_, idx) => idx !== i));
  };

  const handleCreate = () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!bodyText.trim()) { toast({ title: "Body text is required", variant: "destructive" }); return; }

    const components: CreateWaTemplateInput["components"] = [];

    if (headerText.trim()) {
      components.push({ type: "HEADER", text: headerText.trim(), format: "TEXT" });
    }

    components.push({ type: "BODY", text: bodyText.trim() });

    if (footerText.trim()) {
      components.push({ type: "FOOTER", text: footerText.trim() });
    }

    if (buttons.length > 0) {
      components.push({ type: "BUTTONS", buttons: buttons.map((b) => ({ type: b.type, text: b.text, url: b.url, phoneNumber: b.phoneNumber })) });
    }

    setAdding(true);
    createMutation.mutate(
      { data: { channelId: Number(channelId), name: name.trim(), language, category, components } },
      {
        onSuccess: (result) => {
          toast({ title: "Template created on Meta", description: `"${result.name}" sent for approval.` });
          queryClient.invalidateQueries({ queryKey: ["listWaTemplates", channelId] });
          queryClient.invalidateQueries({ queryKey: ["listWhatsappBlastTemplates", channelId] });
          onSuccess();
        },
        onError: (err) => {
          toast({ title: "Creation failed", description: (err as { message?: string })?.message ?? "Unknown error", variant: "destructive" });
        },
        onSettled: () => setAdding(false),
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create WhatsApp Template</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Template Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. order_confirmation" />
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_US">English (US)</SelectItem>
                <SelectItem value="en_GB">English (UK)</SelectItem>
                <SelectItem value="id">Indonesian</SelectItem>
                <SelectItem value="ms">Malay</SelectItem>
                <SelectItem value="zh_CN">Chinese (Simplified)</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v: "MARKETING" | "UTILITY" | "AUTHENTICATION") => setCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MARKETING">Marketing</SelectItem>
              <SelectItem value="UTILITY">Utility</SelectItem>
              <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Header Text (optional)</Label>
          <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="e.g. Your order is confirmed" />
        </div>

        <div className="space-y-1.5">
          <Label>Body *</Label>
          <Textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Use {{1}}, {{2}} for variables"
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Footer (optional)</Label>
          <Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="e.g. Reply STOP to unsubscribe" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Buttons</Label>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => addButton("QUICK_REPLY")}>+ Quick Reply</Button>
              <Button variant="outline" size="sm" onClick={() => addButton("URL")}>+ URL</Button>
              <Button variant="outline" size="sm" onClick={() => addButton("PHONE_NUMBER")}>+ Phone</Button>
            </div>
          </div>
          {buttons.map((btn, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-md p-2">
              <Badge variant="outline" className="text-xs shrink-0">{btn.type}</Badge>
              <Input
                className="h-8 text-sm flex-1"
                value={btn.text}
                onChange={(e) => updateButton(i, "text", e.target.value)}
                placeholder="Button text"
              />
              {(btn.type === "URL" || btn.type === "PHONE_NUMBER") && (
                <Input
                  className="h-8 text-sm flex-1"
                  value={btn.url ?? btn.phoneNumber ?? ""}
                  onChange={(e) => updateButton(i, btn.type === "URL" ? "url" : "phoneNumber", e.target.value)}
                  placeholder={btn.type === "URL" ? "https://..." : "+1..."}
                />
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeButton(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onSuccess()}>Cancel</Button>
          <Button onClick={handleCreate} disabled={adding}>
            {adding && <Spinner className="w-4 h-4 mr-1" />}
            Send to Meta
          </Button>
        </div>
      </div>
    </>
  );
}
