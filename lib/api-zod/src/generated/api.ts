export type HealthCheckResponse = { status: string };

export type ListUsersResponseItem = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "supervisor" | "agent";
  departmentId: number | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
};
export type ListUsersResponse = ListUsersResponseItem[];

export type CreateUserBody = {
  email: string;
  name: string;
  role: "admin" | "supervisor" | "agent";
  departmentId?: number | null;
  avatarUrl?: string | null;
  password?: string;
};

export type GetUserParams = { id: number };
export type GetUserResponse = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "supervisor" | "agent";
  departmentId: number | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
};

export type UpdateUserParams = { id: number };
export type UpdateUserBody = {
  name?: string;
  role?: "admin" | "supervisor" | "agent";
  departmentId?: number | null;
  avatarUrl?: string | null;
  isActive?: boolean;
};
export type UpdateUserResponse = GetUserResponse;

export type ResetUserPasswordParams = { id: number };
export type ResetUserPasswordResponse = { temporaryPassword: string };

export type DeleteUserParams = { id: number };

export type ListDepartmentsResponseItem = {
  id: number;
  name: string;
  description?: string | null;
  routingMode: "manual" | "round_robin";
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
};
export type ListDepartmentsResponse = ListDepartmentsResponseItem[];

export type CreateDepartmentBody = {
  name: string;
  description?: string | null;
  routingMode: "manual" | "round_robin";
};

export type GetDepartmentParams = { id: number };
export type GetDepartmentResponse = ListDepartmentsResponseItem;

export type UpdateDepartmentParams = { id: number };
export type UpdateDepartmentBody = {
  name?: string;
  description?: string | null;
  routingMode?: "manual" | "round_robin";
  isActive?: boolean;
};
export type UpdateDepartmentResponse = GetDepartmentResponse;

export type DeleteDepartmentParams = { id: number };

export type ListChannelsResponseItem = {
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
  createdAt: string;
};
export type ListChannelsResponse = ListChannelsResponseItem[];

export type CreateChannelBody = {
  name: string;
  channelType: "whatsapp" | "instagram" | "facebook";
  externalId?: string | null;
  wabaId?: string | null;
  phoneNumber?: string | null;
  pageId?: string | null;
  accessToken?: string | null;
  webhookVerifyToken?: string | null;
};

export type GetChannelParams = { id: number };
export type GetChannelResponse = ListChannelsResponseItem;

export type UpdateChannelParams = { id: number };
export type UpdateChannelBody = {
  name?: string;
  externalId?: string | null;
  wabaId?: string | null;
  phoneNumber?: string | null;
  pageId?: string | null;
  accessToken?: string | null;
  webhookVerifyToken?: string | null;
  isActive?: boolean;
};
export type UpdateChannelResponse = GetChannelResponse;

export type DeleteChannelParams = { id: number };

export type ListContactsQueryParams = { search?: string; channelType?: string };
export type ListContactsResponseItem = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  channelType: "whatsapp" | "instagram" | "facebook";
  externalId?: string;
  customFields: string | null;
  createdAt: string;
};
export type ListContactsResponse = ListContactsResponseItem[];

export type CreateContactBody = {
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  channelType: "whatsapp" | "instagram" | "facebook";
  externalId: string;
  customFields?: string | null;
};

export type ImportContactsBody = {
  channelType: "whatsapp" | "instagram" | "facebook";
  contacts: { name: string; phone: string; email?: string | null }[];
};

export type GetContactParams = { id: number };
export type GetContactResponse = ListContactsResponseItem;

export type UpdateContactParams = { id: number };
export type UpdateContactBody = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  customFields?: string | null;
};
export type UpdateContactResponse = GetContactResponse;

export type ListConversationsQueryParams = {
  status?: string;
  channelId?: number;
  departmentId?: number;
  assignedAgentId?: number;
  channelType?: string;
  daysOld?: number;
};

export type ListConversationsResponseItem = {
  id: number;
  contactId?: number;
  channelId?: number;
  channelType: "whatsapp" | "instagram" | "facebook";
  phoneNumberId: string | null;
  wabaId: string | null;
  departmentId: number | null;
  assignedAgentId: number | null;
  status: "open" | "pending" | "resolved" | "snoozed";
  subject: string | null;
  lastMessageAt: string | null;
  unreadCount?: number;
  contact?: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
    channelType: "whatsapp" | "instagram" | "facebook";
    externalId?: string;
    customFields: string | null;
    createdAt: string;
  };
  channel?: {
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
    createdAt: string;
  };
  assignedAgent?: { id?: number; name?: string; avatarUrl?: string | null } | null;
  department?: { id?: number; name?: string } | null;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
export type ListConversationsResponse = ListConversationsResponseItem[];

export type CreateConversationBody = {
  contactId: number;
  channelId: number;
  channelType: "whatsapp" | "instagram" | "facebook";
  departmentId?: number | null;
  assignedAgentId?: number | null;
  subject?: string | null;
};

export type GetConversationParams = { id: number };
export type GetConversationResponse = ListConversationsResponseItem;

export type UpdateConversationParams = { id: number };
export type UpdateConversationBody = {
  status?: "open" | "pending" | "resolved" | "snoozed";
  departmentId?: number | null;
  assignedAgentId?: number | null;
  subject?: string | null;
};
export type UpdateConversationResponse = GetConversationResponse;

export type AssignConversationParams = { id: number };
export type AssignConversationBody = {
  departmentId?: number | null;
  assignedAgentId?: number | null;
};
export type AssignConversationResponse = GetConversationResponse;

export type ResolveConversationParams = { id: number };
export type ResolveConversationResponse = GetConversationResponse;

export type ReopenConversationParams = { id: number };
export type ReopenConversationResponse = GetConversationResponse;

export type ListMessagesParams = { conversationId: number };
export type ListMessagesResponseItem = {
  id: number;
  conversationId: number;
  senderType?: "contact" | "agent" | "system";
  senderId: number | null;
  direction: "inbound" | "outbound";
  contentType: "text" | "image" | "video" | "audio" | "document" | "location" | "sticker" | "template" | "note";
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isRead?: boolean;
  externalMessageId: string | null;
  metadata: string | null;
  senderName: string | null;
  deliveryStatus?: "pending" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
};
export type ListMessagesResponse = ListMessagesResponseItem[];

export type SendMessageParams = { conversationId: number };
export type SendMessageBody = {
  contentType: "text" | "image" | "video" | "audio" | "document" | "location" | "sticker" | "template" | "note";
  content?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  senderId?: number | null;
  senderName?: string | null;
};

export type LoginBody = { email: string; password: string };
export type LoginResponse = { token: string; user: GetUserResponse };

export type ChangePasswordBody = { currentPassword: string; newPassword: string };

export type GetStatsOverviewResponse = {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  totalContacts: number;
  totalAgents: number;
  avgResponseTime: number;
  unassignedConversations?: number;
};

export type ListWhatsappBlastsQueryParams = { page?: number; limit?: number; search?: string };
export type CreateWhatsappBlastBody = {
  name: string;
  channelId: number;
  templateName: string;
  templateLanguage: string;
  templateParams?: string[];
  scheduledAt?: string | null;
  contactIds?: number[];
};

export type ExternalWhatsappSendBody = {
  channelName?: string;
  channelId?: number;
  to: string;
  content: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
};

export type ExternalWhatsappSendResponse = {
  success?: boolean;
  messageId?: string;
  externalMessageId?: string | null;
  conversationId?: number;
  messageRecordId?: number;
  templateMatched?: string | null;
};
