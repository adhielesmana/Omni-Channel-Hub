import { useState } from "react";
import { useListWhatsappBlastTemplates, useListChannels } from "@workspace/api-client-react";
import type { WhatsAppTemplate } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WhatsappTemplatesPage() {
  const [channelId, setChannelId] = useState("");
  const [search, setSearch] = useState("");

  const { data: channels } = useListChannels({});
  const whatsappChannels = channels?.filter((c) => c.channelType === "whatsapp") ?? [];

  const { data: templates, isLoading } = useListWhatsappBlastTemplates(
    { channelId: Number(channelId) },
    { query: { enabled: !!channelId, queryKey: ["listWhatsappBlastTemplates", channelId] } }
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
            ) : !filtered || filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  {search ? `No templates matching "${search}"` : "No approved templates found"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t, i) => (
                <TableRow key={t.id ?? i} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{t.name}</TableCell>
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
    </div>
  );
}
