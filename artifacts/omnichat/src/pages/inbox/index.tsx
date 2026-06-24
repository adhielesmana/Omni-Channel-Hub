import { useState } from "react";
import { 
  Search, Filter, Inbox as InboxIcon, CheckCircle2, Clock, Check,
  MoreVertical, Phone, Mail, Hash, UserSquare, AlertCircle, Info, Send,
  MessageSquare
} from "lucide-react";
import { useListConversations, getListConversationsQueryKey, useListMessages, getListMessagesQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function Inbox() {
  const [activeTab, setActiveTab] = useState("all");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  const { data: conversations, isLoading: isConversationsLoading } = useListConversations({
    status: activeTab !== "all" ? activeTab : undefined
  });

  const { data: messages, isLoading: isMessagesLoading } = useListMessages(activeConversationId || 0, {
    query: {
      enabled: !!activeConversationId
    }
  });

  const activeConversation = conversations?.find(c => c.id === activeConversationId);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      
      {/* Pane 1: Conversation List */}
      <div className="w-[340px] flex-shrink-0 border-r bg-card flex flex-col h-full relative z-10">
        <div className="p-4 border-b flex flex-col gap-4">
          <h1 className="text-xl font-bold tracking-tight">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-9 grid grid-cols-4 bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">Pend</TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs">Done</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {isConversationsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading conversations...</div>
            ) : conversations?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                <InboxIcon className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">No conversations found</p>
                <p className="text-xs mt-1 opacity-70">You're all caught up!</p>
              </div>
            ) : (
              conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`w-full text-left p-4 border-b transition-colors flex gap-3 hover:bg-muted/30 ${
                    activeConversationId === conv.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10 border border-border/50">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm truncate">{conv.contact?.name || "Unknown Contact"}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground truncate pr-2">
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
        </ScrollArea>
      </div>

      {/* Pane 2: Main Chat Area */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col h-full bg-background min-w-[400px]">
          {/* Chat Header */}
          <div className="h-16 px-6 border-b bg-card flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {activeConversation.contact?.name?.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-sm leading-tight">{activeConversation.contact?.name}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="capitalize">{activeConversation.channelType}</span>
                  <span>•</span>
                  <span>{activeConversation.contact?.phone || activeConversation.contact?.email || 'Unknown Contact Info'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-muted/50 rounded-lg p-1 flex items-center border shadow-sm">
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                  {activeConversation.department?.name || 'Unassigned'}
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
                  {activeConversation.assignedAgent?.name || 'Unassigned'}
                </Button>
              </div>
              <Button variant="outline" size="sm" className="h-9">
                {activeConversation.status === 'resolved' ? 'Reopen' : 'Resolve'}
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
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
                        isNote ? 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800' :
                        isInbound ? 'bg-card border text-card-foreground rounded-tl-sm' : 
                        'bg-primary text-primary-foreground rounded-tr-sm'
                      }`}>
                        {isNote && <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Internal Note</div>}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isInbound ? 'text-muted-foreground' : 'text-primary-foreground/70'
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {!isInbound && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Chat Composer */}
          <div className="p-4 bg-card border-t shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <textarea 
                  placeholder="Type a message..."
                  className="w-full min-h-[60px] max-h-[150px] resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={2}
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <Button className="w-12 h-12 rounded-xl" size="icon">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-xs text-muted-foreground">
              <div className="flex gap-4">
                <button className="hover:text-foreground transition-colors font-medium">Add Note</button>
                <button className="hover:text-foreground transition-colors font-medium">Use Template</button>
                <button className="hover:text-foreground transition-colors font-medium">Attach File</button>
              </div>
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground min-w-[400px]">
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
        <div className="w-[300px] flex-shrink-0 border-l bg-card flex flex-col h-full overflow-y-auto">
          <div className="p-6 border-b flex flex-col items-center text-center">
            <Avatar className="w-20 h-20 mb-4 shadow-sm border-2 border-background">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {activeConversation.contact?.name?.substring(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg">{activeConversation.contact?.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Customer since {new Date(activeConversation.contact?.createdAt || Date.now()).toLocaleDateString()}</p>
            
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 h-9 text-xs">Profile</Button>
              <Button variant="outline" className="flex-1 h-9 text-xs">Activity</Button>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-6">
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <UserSquare className="w-4 h-4" /> Contact Info
              </h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone</span>
                  <span className="font-medium text-right">{activeConversation.contact?.phone || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email</span>
                  <span className="font-medium text-right truncate max-w-[150px]">{activeConversation.contact?.email || '-'}</span>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" /> Custom Fields
              </h4>
              <div className="flex flex-col gap-2">
                {activeConversation.contact?.customFields ? (
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto text-muted-foreground">
                    {activeConversation.contact.customFields}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No custom fields defined</p>
                )}
              </div>
            </section>

            <Separator />

            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" /> Assignment
              </h4>
              <div className="bg-muted/30 rounded-xl border p-4 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Department</span>
                  <div className="text-sm font-medium">{activeConversation.department?.name || 'None'}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Agent</span>
                  <div className="text-sm font-medium">{activeConversation.assignedAgent?.name || 'Unassigned'}</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
