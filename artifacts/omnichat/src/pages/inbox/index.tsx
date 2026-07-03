import { useState, useRef, useEffect } from "react";
import {
  Search, Inbox as InboxIcon, CheckCircle2, Check, CheckCheck, Clock, AlertCircle,
  MoreVertical, Phone, Mail, Hash, UserSquare, Info, Send,
  MessageSquare, StickyNote, FileText, ArrowLeft
} from "lucide-react";
import {
  useListConversations, useListMessages, useSendMessage,
  useResolveConversation, useReopenConversation,
  getListConversationsQueryKey, getListMessagesQueryKey,
  useListUsers, useListDepartments, useAssignConversation,
} from "@workspace/api-client-react";
import { MessageInputContentType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

function formatChatDate(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

  if (diffHrs < 24) {
    return timeStr;
  }

  // Check if "Yesterday" (between 24 and 48 hours ago, and calendar day is one before)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24);

  if (dayDiff === 1) {
    return `Yesterday ${timeStr}`;
  }

  // Older: "30 Jun 2026 2:30 PM"
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year} ${timeStr}`;
}

const GOOGLE_MAPS_RE =
  /https?:\/\/(?:www\.)?(?:maps\.google\.com|google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)(?:\/[^\s]*)?/i;

// Short-link URLs (goo.gl/maps, maps.app.goo.gl) can't have coords extracted inline
const GOOGLE_MAPS_SHORT_RE =
  /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)(?:\/[^\s]*)?/i;

const GOOGLE_MAPS_COORDS_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

function extractGoogleMapsUrl(text: string): string | null {
  const m = text.match(GOOGLE_MAPS_RE);
  return m ? m[0] : null;
}

function extractCoords(url: string): { lat: string; lng: string } | null {
  const c = url.match(GOOGLE_MAPS_COORDS_RE);
  if (c) return { lat: c[1], lng: c[2] };
  // Try ?q=lat,lng pattern
  const q = new URL(url).searchParams.get("q");
  if (q) {
    const parts = q.split(",");
    if (parts.length >= 2 && /^-?\d+\.\d+$/.test(parts[0]) && /^-?\d+\.\d+$/.test(parts[1])) {
      return { lat: parts[0].trim(), lng: parts[1].trim() };
    }
  }
  return null;
}

function renderMessageContent(msg: { contentType?: string | null; content?: string | null; mediaUrl?: string | null }) {
  const url = msg.mediaUrl ?? undefined;
  const caption = msg.content;
  switch (msg.contentType) {
    case "image":
    case "sticker": {
      if (!url) return <p className="text-sm italic opacity-70">[{msg.contentType}]</p>;
      return (
        <div className="flex flex-col gap-1">
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={caption ?? "image"}
              loading="lazy"
              className={`rounded-lg ${msg.contentType === "sticker" ? "max-h-32 w-auto" : "max-w-full max-h-72 object-cover"}`}
            />
          </a>
          {caption && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{caption}</p>}
        </div>
      );
    }
    case "video": {
      if (!url) return <p className="text-sm italic opacity-70">[video]</p>;
      return (
        <div className="flex flex-col gap-1">
          <video src={url} controls className="rounded-lg max-w-full max-h-72" />
          {caption && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{caption}</p>}
        </div>
      );
    }
    case "audio": {
      if (!url) return <p className="text-sm italic opacity-70">[audio]</p>;
      return <audio src={url} controls className="max-w-full" />;
    }
    case "document": {
      if (!url) return <p className="text-sm italic opacity-70">{caption || "[document]"}</p>;
      return (
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline">
          <FileText className="w-4 h-4 shrink-0" />
          <span className="break-all">{caption || "Document"}</span>
        </a>
      );
    }
    case "location":
      return <p className="text-sm leading-relaxed">📍 {caption || "Shared location"}</p>;
    default:
      return <TextWithMaps text={caption} />;
  }
}

function TextWithMaps({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const mapUrl = extractGoogleMapsUrl(text);
  if (!mapUrl) return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>;

  const coords = (() => {
    try {
      return extractCoords(mapUrl);
    } catch {
      return null;
    }
  })();

  return (
    <div className="flex flex-col gap-2">
      {coords ? (
        <a href={mapUrl} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-black/10">
          <iframe
            title="Google Maps"
            src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`}
            loading="lazy"
            className="w-full h-36 border-0"
          />
        </a>
      ) : (
        <a href={mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline break-all">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-700 text-xs font-bold">📍</span>
          Open in Google Maps
        </a>
      )}
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}

export default function Inbox() {
  const [activeTab, setActiveTab] = useState("open");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [composerMode, setComposerMode] = useState<"message" | "note">("message");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevConversationsRef = useRef<number>(0);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const selectedConversationId = activeConversationId ?? -1;

  const { data: conversations, isLoading: isConversationsLoading } = useListConversations(
    { status: activeTab !== "all" ? activeTab : undefined },
    {
      query: {
        refetchInterval: 3000,
        staleTime: 0,
        refetchIntervalInBackground: true,
        queryKey: getListConversationsQueryKey({ status: activeTab !== "all" ? activeTab : undefined }),
      },
    }
  );

  const { data: messages, isLoading: isMessagesLoading } = useListMessages(
    selectedConversationId,
    {
      query: {
        enabled: activeConversationId != null,
        refetchInterval: 3000,
        staleTime: 0,
        refetchIntervalInBackground: true,
        queryKey: getListMessagesQueryKey(selectedConversationId),
      },
    }
  );

  const { data: users } = useListUsers();
  const { data: departments } = useListDepartments();

  const sendMessage = useSendMessage();
  const resolveConversation = useResolveConversation();
  const reopenConversation = useReopenConversation();
  const assignConversation = useAssignConversation();

  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  const filteredConversations = conversations?.filter(c =>
    !searchQuery ||
    c.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessage ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Play a subtle notification sound when new conversations arrive
  useEffect(() => {
    const currentCount = conversations?.length ?? 0;
    const prevCount = prevConversationsRef.current;
    if (currentCount > prevCount && prevCount > 0) {
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = audioCtxRef.current ?? new AC();
        audioCtxRef.current = ctx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } catch {
        // Audio not available — silent fallback
      }
    }
    prevConversationsRef.current = currentCount;
  }, [conversations]);

  const invalidateConversation = () => {
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    if (activeConversationId) {
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeConversationId) });
    }
  };

  const handleSend = () => {
    if (!messageText.trim() || !activeConversationId) return;
    sendMessage.mutate(
      {
        conversationId: activeConversationId,
        data: {
          content: messageText.trim(),
          contentType: composerMode === "note" ? MessageInputContentType.note : MessageInputContentType.text,
          senderName: user?.name ?? null,
        }
      },
      {
        onSuccess: () => {
          setMessageText("");
          invalidateConversation();
        }
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResolveToggle = () => {
    if (!activeConversationId) return;
    if (activeConversation?.status === "resolved") {
      reopenConversation.mutate({ id: activeConversationId }, { onSuccess: invalidateConversation });
    } else {
      resolveConversation.mutate({ id: activeConversationId }, { onSuccess: invalidateConversation });
    }
  };

  const handleAssignAgent = (agentId: string) => {
    if (!activeConversationId) return;
    assignConversation.mutate(
      { id: activeConversationId, data: { assignedAgentId: agentId === "none" ? undefined : Number(agentId) } },
      { onSuccess: invalidateConversation }
    );
  };

  const handleAssignDepartment = (deptId: string) => {
    if (!activeConversationId) return;
    assignConversation.mutate(
      { id: activeConversationId, data: { departmentId: deptId === "none" ? undefined : Number(deptId) } },
      { onSuccess: invalidateConversation }
    );
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">

      {/* Pane 1: Conversation List */}
      <div className={`flex-shrink-0 border-r bg-card flex flex-col h-full relative z-10 w-full md:w-[340px] ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b flex flex-col gap-4">
          <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-9 grid grid-cols-4 bg-muted/50 p-1">
              <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pend</TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs">Done</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="flex flex-col">
            {isConversationsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading conversations...</div>
            ) : filteredConversations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <InboxIcon className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-xs mt-1 opacity-70">You're all caught up!</p>
              </div>
            ) : (
              filteredConversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConversationId(conv.id); setMobileShowChat(true); }}
                  className={`w-full text-left pl-4 pr-4 py-4 border-b transition-colors flex gap-3 hover:bg-muted/30 ${
                    activeConversationId === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10 border border-border/50">
                      {conv.contact?.avatarUrl ? (
                        <AvatarImage src={conv.contact.avatarUrl} alt={conv.contact.name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {conv.contact?.name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full flex items-center justify-center shadow-sm">
                      {conv.channelType === 'whatsapp' && <span className="w-3 h-3 bg-green-500 rounded-full" />}
                      {conv.channelType === 'instagram' && <span className="w-3 h-3 bg-pink-500 rounded-full" />}
                      {conv.channelType === 'facebook' && <span className="w-3 h-3 bg-blue-500 rounded-full" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm truncate">{conv.contact?.name || "Unknown Contact"}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {formatChatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground truncate min-w-0">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                      {conv.unreadCount ? (
                        <Badge variant="default" className="h-5 px-1.5 min-w-[20px] flex justify-center text-[10px] rounded-full">
                          {conv.unreadCount}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Empty state on mobile when no chat selected */}
      {activeConversation ? (
        <div className={`flex-1 flex flex-col h-full bg-background min-w-0 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Chat Header */}
          <div className="h-16 px-4 border-b bg-card flex items-center justify-between shrink-0 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
              <button
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted -ml-1"
                onClick={() => setMobileShowChat(false)}
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <Avatar className="w-9 h-9 flex-shrink-0">
                {activeConversation.contact?.avatarUrl ? (
                  <AvatarImage src={activeConversation.contact.avatarUrl} alt={activeConversation.contact?.name ?? "Customer"} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {activeConversation.contact?.name?.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 overflow-hidden">
                <h2 className="font-semibold text-sm leading-tight truncate">{activeConversation.contact?.name}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="capitalize">{activeConversation.channelType}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline truncate">{activeConversation.contact?.phone || activeConversation.contact?.email || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-2">
                <Select
                  value={activeConversation.department?.id?.toString() ?? "none"}
                  onValueChange={handleAssignDepartment}
                >
                  <SelectTrigger className="h-8 text-xs w-[130px] border-muted">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={activeConversation.assignedAgent?.id?.toString() ?? "none"}
                  onValueChange={handleAssignAgent}
                >
                  <SelectTrigger className="h-8 text-xs w-[130px] border-muted">
                    <SelectValue placeholder="Assign agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users?.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant={activeConversation.status === 'resolved' ? 'outline' : 'default'}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleResolveToggle}
                disabled={resolveConversation.isPending || reopenConversation.isPending}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{activeConversation.status === 'resolved' ? 'Reopen' : 'Resolve'}</span>
              </Button>

              <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="flex flex-col justify-end min-h-full gap-4">
              {isMessagesLoading ? (
                <div className="w-full flex justify-center p-4">
                  <div className="animate-pulse flex gap-2">
                    <div className="w-2 h-2 bg-primary/40 rounded-full" />
                    <div className="w-2 h-2 bg-primary/40 rounded-full" />
                    <div className="w-2 h-2 bg-primary/40 rounded-full" />
                  </div>
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground my-8">
                  Start of conversation with {activeConversation.contact?.name}
                </div>
              ) : (
                messages?.map((msg) => {
                  const isInbound = msg.direction === 'inbound';
                  const isNote = msg.contentType === 'note';
                  return (
                    <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-1`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                        isNote
                          ? 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                          : isInbound
                            ? 'bg-card border text-card-foreground rounded-tl-sm'
                            : 'bg-primary text-primary-foreground rounded-tr-sm'
                      }`}>
                        {isNote && <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Internal Note</div>}
                        {renderMessageContent(msg)}
                        <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                          isInbound ? 'text-muted-foreground' : 'text-primary-foreground/70'
                        }`}>
                          {!isInbound && !isNote && msg.senderName && (
                            <span className="font-medium opacity-80">{msg.senderName}</span>
                          )}
                          {formatChatDate(msg.createdAt)}
                          {!isInbound && !isNote && (
                            msg.deliveryStatus === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                            ) : msg.deliveryStatus === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            ) : msg.deliveryStatus === 'sent' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
                            ) : msg.deliveryStatus === 'failed' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-primary-foreground/70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Composer */}
          <div className="p-2 md:p-4 bg-card border-t shrink-0">
            {composerMode === "note" && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs font-medium text-amber-700">Internal note — not visible to customer</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <div className="relative flex-1">
                <textarea
                  placeholder={composerMode === "note" ? "Write an internal note..." : "Type a message..."}
                  className={`h-12 w-full max-h-[150px] resize-none rounded-xl border px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    composerMode === "note" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "border-input bg-background"
                  }`}
                  rows={1}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <Button
                className="w-12 h-12 shrink-0 rounded-xl"
                size="icon"
                onClick={handleSend}
                disabled={!messageText.trim() || sendMessage.isPending}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-xs text-muted-foreground">
              <div className="flex gap-3">
                <button
                  className={`hover:text-foreground transition-colors font-medium flex items-center gap-1 ${composerMode === "message" ? "text-foreground" : ""}`}
                  onClick={() => setComposerMode("message")}
                >
                  <MessageSquare className="w-3 h-3" /> Reply
                </button>
                <button
                  className={`hover:text-foreground transition-colors font-medium flex items-center gap-1 ${composerMode === "note" ? "text-amber-600" : ""}`}
                  onClick={() => setComposerMode("note")}
                >
                  <StickyNote className="w-3 h-3" /> Note
                </button>
              </div>
              <span>Enter to send · Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground min-w-0 md:min-w-[400px] hidden md:flex">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 opacity-50" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No conversation selected</h2>
          <p className="text-sm max-w-sm text-center">
            Select a conversation from the left pane to view messages and respond.
          </p>
        </div>
      )}

      {/* Pane 3: Details Panel */}
      {activeConversation && (
        <div className="hidden lg:flex w-[280px] flex-shrink-0 border-l bg-card flex-col h-full overflow-y-auto">
          <div className="p-5 border-b flex flex-col items-center text-center">
            <Avatar className="w-16 h-16 mb-3 shadow-sm border-2 border-background">
              {activeConversation.contact?.avatarUrl ? (
                <AvatarImage src={activeConversation.contact.avatarUrl} alt={activeConversation.contact?.name ?? "Customer"} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {activeConversation.contact?.name?.substring(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-base">{activeConversation.contact?.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customer since {new Date(activeConversation.contact?.createdAt || Date.now()).toLocaleDateString()}
            </p>
          </div>

          <div className="p-5 flex flex-col gap-5">
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <UserSquare className="w-3.5 h-3.5" /> Contact Info
              </h4>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs"><Phone className="w-3 h-3" /> Phone</span>
                  <span className="font-medium text-right text-xs">{activeConversation.contact?.phone || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs"><Mail className="w-3 h-3" /> Email</span>
                  <span className="font-medium text-right truncate max-w-[130px] text-xs">{activeConversation.contact?.email || '—'}</span>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Assignment
              </h4>
              <div className="bg-muted/30 rounded-xl border p-3 space-y-2.5">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Department</span>
                  <div className="text-sm font-medium">{activeConversation.department?.name || 'None'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Agent</span>
                  <div className="text-sm font-medium">{activeConversation.assignedAgent?.name || 'Unassigned'}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Status</span>
                  <Badge variant={activeConversation.status === 'resolved' ? 'secondary' : 'default'} className="text-[10px] h-5 capitalize">
                    {activeConversation.status}
                  </Badge>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" /> Channel
              </h4>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  activeConversation.channelType === 'whatsapp' ? 'bg-green-500' :
                  activeConversation.channelType === 'instagram' ? 'bg-pink-500' : 'bg-blue-500'
                }`} />
                <span className="text-sm capitalize">{activeConversation.channelType}</span>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
