import { useState } from "react";
import { useListWhatsappBlastTemplates, useListChannels } from "@workspace/api-client-react";
import type { WhatsAppTemplate } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function WhatsappTemplatesPage() {
  const [channelId, setChannelId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  const { data: channels } = useListChannels({});
  const whatsappChannels = channels?.filter((c) => c.channelType === "whatsapp") ?? [];

  const { data: templates, isLoading, error } = useListWhatsappBlastTemplates(
    { channelId: Number(channelId) },
    { query: { enabled: !!channelId, queryKey: ["listWhatsappBlastTemplates", channelId], retry: false } }
  );

  const filtered = templates?.filter((t) =>
    !search ||
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.id?.includes(search)
  );

  const bodyPreview = (t: { components?: Array<{ type?: string; text?: string }> }) => {
    const body = t.components?.find((c) => c.type === "BODY");
    return body?.text?.substring(0, 80) ?? "-";
  };

  const statusVariant = (status?: string) => {
    if (status === "APPROVED") return "bg-green-100 text-green-700 border-green-300" as const;
    if (status === "PENDING") return "bg-yellow-100 text-yellow-700 border-yellow-300" as const;
    if (status === "REJECTED") return "bg-red-100 text-red-700 border-red-300" as const;
    return "bg-gray-100 text-gray-700 border-gray-300" as const;
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">WhatsApp Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Approved message templates from Meta</p>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {!channelId ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  Select a WhatsApp channel to view templates
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading templates...</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32">
                  <p className="text-red-500 font-medium">Failed to load templates</p>
                  <p className="text-muted-foreground text-xs mt-1 max-w-md mx-auto">
                    {(error as { message?: string })?.message || "Unknown error. Check the channel configuration."}
                  </p>
                </TableCell>
              </TableRow>
            ) : !filtered || filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  {search ? `No templates matching "${search}"` : "No approved templates found"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t, i) => (
                <TableRow key={t.id ?? i} className="hover:bg-muted/30">
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
                    <Badge variant="outline" className="text-xs capitalize">{t.category?.toLowerCase()}</Badge>
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
                <p className="font-medium capitalize">{selectedTemplate?.category?.toLowerCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p><Badge variant="outline" className={`text-xs ${statusVariant(selectedTemplate?.status)}`}>{selectedTemplate?.status}</Badge></p>
              </div>
              <div>
                <span className="text-muted-foreground">Channel</span>
                <p className="font-medium">{selectedTemplate?.channelName}</p>
              </div>
            </div>

            {selectedTemplate?.components?.map((comp, ci) => {
              const type = comp.type as string;
              if (type === "HEADER") {
                return (
                  <div key={ci}>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Header</span>
                    <p className="text-sm mt-1 bg-muted/50 rounded-md p-3">{comp.text as string ?? comp.format as string ?? "-"}</p>
                  </div>
                );
              }
              if (type === "BODY") {
                return (
                  <div key={ci}>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Body</span>
                    <p className="text-sm mt-1 bg-muted/50 rounded-md p-3 whitespace-pre-wrap leading-relaxed">{comp.text as string ?? "-"}</p>
                  </div>
                );
              }
              if (type === "FOOTER") {
                return (
                  <div key={ci}>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Footer</span>
                    <p className="text-sm mt-1 text-muted-foreground">{comp.text as string ?? "-"}</p>
                  </div>
                );
              }
              if (type === "BUTTONS" && Array.isArray(comp.buttons)) {
                return (
                  <div key={ci}>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buttons</span>
                    <div className="mt-1 space-y-1">
                      {(comp.buttons as Array<Record<string, unknown>>).map((btn, bi) => (
                        <div key={bi} className="text-sm bg-muted/50 rounded-md px-3 py-2">
                          {btn.text as string ?? btn.type as string}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
