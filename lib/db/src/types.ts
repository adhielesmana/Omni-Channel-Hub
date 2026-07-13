export type UserStatus = "admin" | "supervisor" | "agent";
export type ChannelType = "whatsapp" | "instagram" | "facebook";
export type MessageContentType = "text" | "image" | "video" | "audio" | "document" | "location" | "sticker" | "template" | "note";
export type ConversationStatus = "open" | "pending" | "resolved" | "snoozed";
export type BlastStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type RecipientStatus = "queued" | "pending" | "sent" | "delivered" | "failed" | "processing";
export type WaTemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
export type DepartmentRoutingMode = "manual" | "round_robin";
export type Direction = "inbound" | "outbound";
export type SenderType = "contact" | "agent" | "system";
export type BlastSource = "manual" | "external";
export type DeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserStatus;
  departmentId: number | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  routingMode: DepartmentRoutingMode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: number;
  name: string;
  channelType: ChannelType;
  externalId: string | null;
  wabaId: string | null;
  phoneNumber: string | null;
  pageId: string | null;
  accessToken: string | null;
  webhookVerifyToken: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  channelType: ChannelType;
  externalId: string;
  customFields: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: number;
  contactId: number;
  channelId: number;
  channelType: ChannelType;
  phoneNumberId: string | null;
  wabaId: string | null;
  departmentId: number | null;
  assignedAgentId: number | null;
  status: ConversationStatus;
  subject: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  senderType: SenderType;
  senderId: number | null;
  direction: Direction;
  contentType: MessageContentType;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead: boolean;
  externalMessageId: string | null;
  metadata: string | null;
  senderName: string | null;
  deliveryStatus: DeliveryStatus | null;
  createdAt: Date;
}

export interface WhatsappBlast {
  id: number;
  name: string;
  channelId: number;
  templateName: string;
  templateLanguage: string;
  templateParams: string | null;
  source: BlastSource;
  createdByUserId: number | null;
  externalApiKey: string | null;
  externalSourceIp: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  status: BlastStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaTemplate {
  id: number;
  metaTemplateId: string | null;
  name: string;
  language: string;
  category: string | null;
  channelId: number;
  status: WaTemplateStatus;
  components: string | null;
  rejectReason: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsappBlastRecipient {
  id: number;
  blastId: number;
  contactId: number | null;
  phone: string;
  templateParams: string | null;
  content: string | null;
  status: RecipientStatus;
  externalMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}
