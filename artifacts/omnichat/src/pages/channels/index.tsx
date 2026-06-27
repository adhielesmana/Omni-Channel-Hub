import { useState } from "react";
import { useListChannels, useCreateChannel, useUpdateChannel, useDeleteChannel } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Share2, Plus, Settings2, Wifi, WifiOff,
  Phone, Hash, Key, ShieldCheck, Fingerprint,
  Trash2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ChannelType = "whatsapp" | "instagram" | "facebook";

const CHANNEL_META: Record<ChannelType, { label: string; color: string; bg: string; icon: string }> = {
  whatsapp:  { label: "WhatsApp Business", color: "text-green-700",  bg: "bg-green-50 border-green-200",  icon: "💬" },
  instagram: { label: "Instagram DM",      color: "text-pink-700",   bg: "bg-pink-50 border-pink-200",    icon: "📸" },
  facebook:  { label: "Facebook Messenger",color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    icon: "💙" },
};

const EMPTY_FORM = {
  name: "",
  channelType: "" as ChannelType | "",
  phoneNumberId: "",
  wabaId: "",
  phoneNumber: "",
  pageId: "",
  accessToken: "",
  webhookVerifyToken: "",
};

export default function Channels() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [activeChannel, setActiveChannel] = useState<{
    id: number;
    name: string;
    channelType: "whatsapp" | "instagram" | "facebook";
    externalId?: string | null;
    wabaId?: string | null;
    phoneNumber?: string | null;
    pageId?: string | null;
    accessToken?: string | null;
    webhookVerifyToken?: string | null;
    isActive: boolean;
    createdAt: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { data: channels, isLoading } = useListChannels();
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();

  const set = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleOpen = () => {
    setForm(EMPTY_FORM);
    setError("");
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim())        { setError("Channel name is required."); return; }
    if (!form.channelType)         { setError("Please select a channel type."); return; }
    if (form.channelType === "whatsapp" && !form.phoneNumberId.trim()) {
      setError("Phone Number ID is required for WhatsApp."); return;
    }
    setError("");

    createChannel.mutate(
      {
        data: {
          name: form.name.trim(),
          channelType: form.channelType as ChannelType,
          ...(form.phoneNumberId.trim()     && { externalId:         form.phoneNumberId.trim() }),
          ...(form.wabaId.trim()            && { wabaId:             form.wabaId.trim() }),
          ...(form.phoneNumber.trim()       && { phoneNumber:        form.phoneNumber.trim() }),
          ...(form.pageId.trim()            && { pageId:             form.pageId.trim() }),
          ...(form.accessToken.trim()       && { accessToken:        form.accessToken.trim() }),
          ...(form.webhookVerifyToken.trim()&& { webhookVerifyToken: form.webhookVerifyToken.trim() }),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
          setOpen(false);
        },
        onError: () => setError("Failed to add channel. Please try again."),
      }
    );
  };

  const isWhatsApp   = form.channelType === "whatsapp";
  const isSocialPage = form.channelType === "instagram" || form.channelType === "facebook";

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Connect and manage your messaging platforms</p>
        </div>
        <Button className="gap-2" size="sm" onClick={handleOpen}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Channel</span>
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading channels…</div>
      ) : !channels?.length ? (
        <div className="text-center p-16 border rounded-2xl bg-card border-dashed flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <Share2 className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">No channels connected yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Connect WhatsApp Business, Instagram DM, or Facebook Messenger to start receiving messages.
            </p>
          </div>
          <Button onClick={handleOpen} className="gap-2 mt-2">
            <Plus className="w-4 h-4" /> Add Your First Channel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {channels.map((channel) => {
            const meta = CHANNEL_META[channel.channelType as ChannelType];
            return (
              <Card key={channel.id} className="shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg ${meta?.bg ?? "bg-muted"}`}>
                      {meta?.icon ?? "📡"}
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">{channel.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {meta?.label ?? channel.channelType}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={channel.isActive ? "default" : "secondary"}
                    className={channel.isActive
                      ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-50"
                      : "bg-muted text-muted-foreground"}
                  >
                    {channel.isActive ? (
                      <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> Connected</span>
                    ) : (
                      <span className="flex items-center gap-1"><WifiOff className="w-3 h-3" /> Disconnected</span>
                    )}
                  </Badge>
                </CardHeader>

                <CardContent className="flex-1 pb-3">
                  <div className="space-y-2">
                    {channel.phoneNumber && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" /> Phone
                        </span>
                        <span className="font-mono text-xs">{channel.phoneNumber}</span>
                      </div>
                    )}
                    {channel.externalId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Fingerprint className="w-3 h-3" /> Phone Number ID
                        </span>
                        <span className="font-mono text-xs truncate max-w-[130px]">{channel.externalId}</span>
                      </div>
                    )}
                    {channel.wabaId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Hash className="w-3 h-3" /> WABA ID
                        </span>
                        <span className="font-mono text-xs truncate max-w-[130px]">{channel.wabaId}</span>
                      </div>
                    )}
                    {channel.pageId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Hash className="w-3 h-3" /> Page ID
                        </span>
                        <span className="font-mono text-xs">{channel.pageId}</span>
                      </div>
                    )}
                    {channel.webhookVerifyToken && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3" /> Webhook token
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">••••••••</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t bg-muted/20 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-2 text-xs"
                    onClick={() => {
                      setActiveChannel(channel);
                      setEditOpen(true);
                      setEditError("");
                    }}
                  >
                    <Settings2 className="w-3.5 h-3.5" /> Configure
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setActiveChannel(channel);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Channel Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Channel</DialogTitle>
            <DialogDescription>
              Connect a WhatsApp Business number, Instagram page, or Facebook page.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {error && (
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Channel type */}
            <div className="flex flex-col gap-1.5">
              <Label>Channel type <span className="text-destructive">*</span></Label>
              <Select
                value={form.channelType}
                onValueChange={v => setForm(f => ({ ...f, channelType: v as ChannelType, phoneNumber: "", pageId: "", phoneNumberId: "", wabaId: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a platform…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">💬 WhatsApp Business</SelectItem>
                  <SelectItem value="instagram">📸 Instagram DM</SelectItem>
                  <SelectItem value="facebook">💙 Facebook Messenger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label>Channel name <span className="text-destructive">*</span></Label>
              <Input
                placeholder={
                  form.channelType === "whatsapp"  ? "e.g. MaxnetPlus WhatsApp" :
                  form.channelType === "instagram" ? "e.g. Instagram Official" :
                  form.channelType === "facebook"  ? "e.g. Facebook Page" :
                  "e.g. Customer Support"
                }
                value={form.name}
                onChange={set("name")}
              />
            </div>

            {/* WhatsApp-specific fields */}
            {isWhatsApp && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone Number ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 1191225537412011"
                    value={form.phoneNumberId}
                    onChange={set("phoneNumberId")}
                  />
                  <p className="text-xs text-muted-foreground">Found in Meta App → WhatsApp → API Setup</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    WhatsApp Business Account ID (WABA ID)
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. 1059777943046360"
                    value={form.wabaId}
                    onChange={set("wabaId")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone number
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Input
                    placeholder="+628991066262"
                    value={form.phoneNumber}
                    onChange={set("phoneNumber")}
                  />
                </div>
              </>
            )}

            {/* Page ID — Instagram / Facebook */}
            {isSocialPage && (
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  {form.channelType === "instagram" ? "Instagram" : "Facebook"} Page ID
                  <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                </Label>
                <Input
                  placeholder="e.g. 123456789"
                  value={form.pageId}
                  onChange={set("pageId")}
                />
              </div>
            )}

            {/* Access Token */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                Access token
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                placeholder="Meta permanent access token"
                type="password"
                value={form.accessToken}
                onChange={set("accessToken")}
              />
            </div>

            {/* Webhook verify token */}
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                Webhook verify token
                <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                placeholder="Token used to verify Meta webhook"
                value={form.webhookVerifyToken}
                onChange={set("webhookVerifyToken")}
              />
              <p className="text-xs text-muted-foreground">
                Set this in Meta App Dashboard → WhatsApp → Configuration → Webhook → Verify Token.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createChannel.isPending} className="gap-2">
              {createChannel.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Connecting…
                </>
              ) : (
                <><Plus className="w-4 h-4" /> Connect Channel</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Channel</DialogTitle>
            <DialogDescription>
              Update settings for {activeChannel?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {editError && (
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {editError}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Channel name</Label>
              <Input defaultValue={activeChannel?.name ?? ""} id="edit-name" />
            </div>

            {/* WhatsApp fields */}
            {activeChannel?.channelType === "whatsapp" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone Number ID
                  </Label>
                  <Input defaultValue={activeChannel?.externalId ?? ""} id="edit-externalId" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    WABA ID
                  </Label>
                  <Input defaultValue={activeChannel?.wabaId ?? ""} id="edit-wabaId" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone number
                  </Label>
                  <Input defaultValue={activeChannel?.phoneNumber ?? ""} id="edit-phoneNumber" />
                </div>
              </>
            )}

            {/* Facebook / Instagram fields */}
            {(activeChannel?.channelType === "facebook" || activeChannel?.channelType === "instagram") && (
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  {activeChannel?.channelType === "instagram" ? "Instagram" : "Facebook"} Page ID
                </Label>
                <Input defaultValue={activeChannel?.pageId ?? ""} id="edit-pageId" />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-muted-foreground" />
                Access token
              </Label>
              <Input type="password" defaultValue={activeChannel?.accessToken ?? ""} id="edit-accessToken" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                Webhook verify token
              </Label>
              <Input defaultValue={activeChannel?.webhookVerifyToken ?? ""} id="edit-webhookVerifyToken" />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!activeChannel) return;
                const name = (document.getElementById("edit-name") as HTMLInputElement)?.value;
                const externalId = (document.getElementById("edit-externalId") as HTMLInputElement)?.value;
                const wabaId = (document.getElementById("edit-wabaId") as HTMLInputElement)?.value;
                const phoneNumber = (document.getElementById("edit-phoneNumber") as HTMLInputElement)?.value;
                const pageId = (document.getElementById("edit-pageId") as HTMLInputElement)?.value;
                const accessToken = (document.getElementById("edit-accessToken") as HTMLInputElement)?.value;
                const webhookVerifyToken = (document.getElementById("edit-webhookVerifyToken") as HTMLInputElement)?.value;

                if (!name?.trim()) {
                  setEditError("Channel name is required.");
                  return;
                }

                const data: Record<string, unknown> = {
                  name: name.trim(),
                  accessToken: accessToken?.trim() || undefined,
                  webhookVerifyToken: webhookVerifyToken?.trim() || undefined,
                };

                if (activeChannel.channelType === "whatsapp") {
                  data.externalId = externalId?.trim() || undefined;
                  data.wabaId = wabaId?.trim() || undefined;
                  data.phoneNumber = phoneNumber?.trim() || undefined;
                } else {
                  data.pageId = pageId?.trim() || undefined;
                }

                updateChannel.mutate(
                  {
                    id: activeChannel.id,
                    data,
                  },
                  {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
                      setEditOpen(false);
                    },
                    onError: () => setEditError("Failed to update channel. Please try again."),
                  }
                );
              }}
              disabled={updateChannel.isPending}
              className="gap-2"
            >
              {updateChannel.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <><Settings2 className="w-4 h-4" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete Channel
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{activeChannel?.name}</strong>? This will remove all channel settings and disconnect the integration. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!activeChannel) return;
                deleteChannel.mutate(
                  { id: activeChannel.id },
                  {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
                      setDeleteOpen(false);
                    },
                  }
                );
              }}
              disabled={deleteChannel.isPending}
              className="gap-2"
            >
              {deleteChannel.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Deleting…
                </>
              ) : (
                <><Trash2 className="w-4 h-4" /> Delete Channel</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
