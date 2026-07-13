export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "supervisor" | "agent";
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
  routingMode: "manual" | "round_robin";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: number;
  name: string;
  channelType: "whatsapp" | "instagram" | "facebook";
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
  channelType: "whatsapp" | "instagram" | "facebook";
  externalId: string;
  customFields: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: number;
  contactId: number;
  channelId: number;
  channelType: "whatsapp" | "instagram" | "facebook";
  phoneNumberId: string | null;
  wabaId: string | null;
  departmentId: number | null;
  assignedAgentId: number | null;
  status: "open" | "pending" | "resolved" | "snoozed";
  subject: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  senderType: "contact" | "agent" | "system";
  senderId: number | null;
  direction: "inbound" | "outbound";
  contentType: "text" | "image" | "video" | "audio" | "document" | "location" | "sticker" | "template" | "note";
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead: boolean;
  externalMessageId: string | null;
  metadata: string | null;
  senderName: string | null;
  deliveryStatus: "pending" | "sent" | "delivered" | "read" | "failed" | null;
  createdAt: Date;
}

export interface WhatsappBlast {
  id: number;
  name: string;
  channelId: number;
  templateName: string;
  templateLanguage: string;
  templateParams: string | null;
  source: "manual" | "external";
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
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
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
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
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
  status: "queued" | "pending" | "sent" | "delivered" | "failed" | "processing";
  externalMessageId: string | null;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}
