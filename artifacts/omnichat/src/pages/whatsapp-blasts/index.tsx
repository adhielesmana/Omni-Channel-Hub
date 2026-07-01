import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListWhatsappBlasts,
  useCreateWhatsappBlast,
  useCancelWhatsappBlast,
  useGetWhatsappBlast,
  useListWhatsappBlastTemplates,
  useListChannels,
} from "@workspace/api-client-react";
import type {
  WhatsappBlast,
  WhatsappBlastRecipient,
  CreateWhatsappBlastInput,
  ListWhatsappBlastsParams,
  WhatsappBlastDetail,
} from "@workspace/api-client-react";
import { Search, Plus, X, Calendar, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  processing: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  cancelled: "bg-gray-100 text-gray-800 border-gray-300",
};

const RECIPIENT_STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function WhatsappBlastsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  const [showCreate, setShowCreate] = useState(false);
  const [selectedBlast, setSelectedBlast] = useState<WhatsappBlast | null>(null);

  const params: ListWhatsappBlastsParams = { page, limit, search: search || undefined };
  const { data, isLoading } = useListWhatsappBlasts(params);
  const queryClient = useQueryClient();
  const createBlast = useCreateWhatsappBlast();
  const cancelBlast = useCancelWhatsappBlast();

  const { data: channels } = useListChannels({});
  const whatsappChannels = channels?.filter((c) => c.channelType === "whatsapp") ?? [];

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCancel = (id: number) => {
    cancelBlast.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listWhatsappBlasts"] });
        },
      }
    );
  };

  if (selectedBlast) {
    return (
      <BlastDetailView
        blast={selectedBlast}
        onBack={() => setSelectedBlast(null)}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">WhatsApp Blast</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Send bulk WhatsApp template messages</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-56 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search blasts..."
              className="pl-9"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Blast
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden flex-1 flex flex-col shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Blast Name</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">Loading blasts...</TableCell>
              </TableRow>
            ) : !data?.data || data.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                  {search ? `No blasts matching "${search}"` : "No blast campaigns yet"}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((item) => {
                const b = item;
                return (
                  <TableRow
                    key={b.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedBlast(b as unknown as WhatsappBlast)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{b.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">#{b.id} · {b.source}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{b.templateName || "Text message"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {b.source === "manual"
                          ? (b.createdByUserName ?? "Unknown")
                          : `External (${b.externalSourceIp ?? b.externalApiKey ?? "unknown"})`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[b.status] ?? ""}`}>
                        {b.status}
                      </Badge>
                      {b.scheduledAt && b.status === "pending" && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(b.scheduledAt).toLocaleDateString()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{b.totalRecipients}</span>
                        {b.sentCount > 0 && (
                          <span className="text-blue-600 text-xs">{b.sentCount} sent</span>
                        )}
                        {b.failedCount > 0 && (
                          <span className="text-red-500 text-xs">{b.failedCount} failed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {b.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleCancel(b.id); }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === page}
                    onClick={() => setPage(p)}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <CreateBlastDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        channels={whatsappChannels}
        onSuccess={() => {
          setShowCreate(false);
          queryClient.invalidateQueries({ queryKey: ["listWhatsappBlasts"] });
        }}
      />
    </div>
  );
}

function CreateBlastDialog({
  open,
  onOpenChange,
  channels,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channels: Array<{ id: number; name: string }>;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState(1);
  const [channelId, setChannelId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [templateParams, setTemplateParams] = useState<string[]>([""]);
  const [name, setName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const { data: templates } = useListWhatsappBlastTemplates(
    { channelId: Number(channelId) },
    { query: { enabled: !!channelId, queryKey: ["listWhatsappBlastTemplates", channelId] } }
  );

  const createBlast = useCreateWhatsappBlast();

  const handleNext = () => setStep((s) => Math.min(s + 1, 4));
  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    const input: CreateWhatsappBlastInput = {
      name: name || `Blast - ${new Date().toLocaleDateString()}`,
      channelId: Number(channelId),
      templateName,
      templateLanguage,
      templateParams: templateParams.filter((p) => p.trim()),
      scheduledAt: scheduledAt || null,
    };

    createBlast.mutate(
      { data: input },
      {
        onSuccess: () => {
          setStep(1);
          setChannelId("");
          setTemplateName("");
          setTemplateLanguage("en_US");
          setTemplateParams([""]);
          setName("");
          setScheduledAt("");
          onSuccess();
        },
      }
    );
  };

  const selectedTemplate = templates?.find((t) => t.name === templateName);
  const bodyComponent = selectedTemplate?.components?.find(
    (c: Record<string, unknown>) => c.type === "BODY"
  ) as { text?: string } | undefined;

  const handleParamCount = selectedTemplate
    ? (bodyComponent?.text?.match(/\{\{(\d+)\}\}/g)?.length ?? 0)
    : 0;

  useEffect(() => {
    if (handleParamCount > templateParams.length) {
      setTemplateParams((prev) => {
        const next = [...prev];
        while (next.length < handleParamCount) next.push("");
        return next;
      });
    }
  }, [handleParamCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create WhatsApp Blast</DialogTitle>
          <DialogDescription>
            Step {step} of 4
            {step === 1 && " — Select channel and template"}
            {step === 2 && " — Configure message"}
            {step === 3 && " — Schedule"}
            {step === 4 && " — Review & confirm"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <Label>WhatsApp Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a WhatsApp channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={String(ch.id)}>{ch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select
                value={templateName}
                onValueChange={setTemplateName}
                disabled={!channelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={channelId ? "Select template" : "Select channel first"} />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id ?? t.name} value={t.name ?? ""}>
                      {t.name} ({t.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Category: {selectedTemplate.category}
                  {bodyComponent && (
                    <> · Body: &quot;{bodyComponent.text?.substring(0, 60)}...&quot;</>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Blast Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Blast - ${new Date().toLocaleDateString()}`}
              />
            </div>
            {handleParamCount > 0 && (
              <div>
                <Label>Template Parameters ({handleParamCount} required)</Label>
                {Array.from({ length: handleParamCount }, (_, i) => (
                  <div key={i} className="mt-2">
                    <Input
                      value={templateParams[i] ?? ""}
                      onChange={(e) => {
                        const next = [...templateParams];
                        next[i] = e.target.value;
                        setTemplateParams(next);
                      }}
                      placeholder={`Parameter ${i + 1}${bodyComponent ? `: ${bodyComponent.text?.match(/\{\{(\d+)\}\}/g)?.[i] ?? ""}` : ""}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Schedule (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Leave empty to send immediately</p>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  className="pl-9"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Blast will be queued and processed in batches according to rate limit settings.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Channel:</span>
              <span className="font-medium">{channels.find((c) => c.id === Number(channelId))?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Template:</span>
              <span className="font-medium">{templateName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium">All WhatsApp contacts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schedule:</span>
              <span className="font-medium">{scheduledAt || "Immediately"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parameters:</span>
              <span className="font-medium">{templateParams.filter((p) => p.trim()).length} values</span>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>Back</Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          )}
          {step < 4 ? (
            <Button onClick={handleNext} disabled={step === 1 && (!channelId || !templateName)}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createBlast.isPending}>
              {createBlast.isPending ? "Creating..." : "Send Blast"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlastDetailView({ blast, onBack }: { blast: WhatsappBlast; onBack: () => void }) {
  const queryClient = useQueryClient();
  const cancelBlast = useCancelWhatsappBlast();

  const { data: detail } = useGetWhatsappBlast(blast.id);
  const recipients = detail?.recipients ?? [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["listWhatsappBlasts"] });
  };

  const handleCancel = () => {
    cancelBlast.mutate(
      { id: blast.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listWhatsappBlasts"] });
          onBack();
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{blast.name}</h1>
          <p className="text-muted-foreground text-sm">Blast detail & recipient status</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {blast.status === "pending" && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Template</p>
          <p className="text-sm font-medium mt-1">{blast.templateName || "Text"}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
          <Badge variant="outline" className={`mt-1 text-xs ${STATUS_COLORS[blast.status] ?? ""}`}>
            {blast.status}
          </Badge>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Source</p>
          <p className="text-sm font-medium mt-1 capitalize">{blast.source}</p>
          {blast.source === "external" && blast.externalSourceIp && (
            <p className="text-xs text-muted-foreground">{blast.externalSourceIp}</p>
          )}
          {blast.source === "manual" && blast.createdByUserName && (
            <p className="text-xs text-muted-foreground">{blast.createdByUserName}</p>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Schedule</p>
          <p className="text-sm font-medium mt-1">
            {blast.scheduledAt
              ? new Date(blast.scheduledAt).toLocaleString()
              : "Immediate"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 border rounded-lg bg-card">
          <p className="text-2xl font-bold">{blast.totalRecipients}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="text-center p-3 border rounded-lg bg-card">
          <p className="text-2xl font-bold text-blue-600">{blast.sentCount}</p>
          <p className="text-xs text-muted-foreground">Sent</p>
        </div>
        <div className="text-center p-3 border rounded-lg bg-card">
          <p className="text-2xl font-bold text-green-600">{blast.deliveredCount}</p>
          <p className="text-xs text-muted-foreground">Delivered</p>
        </div>
        <div className="text-center p-3 border rounded-lg bg-card">
          <p className="text-2xl font-bold text-red-600">{blast.failedCount}</p>
          <p className="text-xs text-muted-foreground">Failed</p>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden flex-1 flex flex-col shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message ID</TableHead>
              <TableHead>Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  Loading recipients...
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                  <TableCell>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${RECIPIENT_STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                    {r.errorMessage && (
                      <p className="text-xs text-red-500 mt-0.5 truncate max-w-[200px]">{r.errorMessage}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {r.externalMessageId ?? "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.sentAt ? new Date(r.sentAt).toLocaleString() : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
