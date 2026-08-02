export type TicketStatus = "Unclaimed" | "Claimed" | "Ongoing" | "Completed" | "Canceled" | string;

export interface TicketListItem {
  id: string;
  title: string;
  status: TicketStatus;
  customerName: string;
  unreadMessageCount?: number;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt?: string;
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
}

export interface Ticket extends TicketListItem {
  description: string;
  imageUrl?: string | null;
  customerId: string;
  assignedToId?: string | null;
  updatedAt: string;
  category?: string;
  sentiment?: string;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface PaginatedTicketResponse {
  items: TicketListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
