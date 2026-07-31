export type CustomerType = "Regular" | "InstitutionalBuyer";
export type CustomerStatus = "Active" | "Inactive" | "Suspended";

export interface CustomerListItem {
  id: string;
  displayName: string;
  email: string;
  customerType: CustomerType;
  status: CustomerStatus;
  phoneNumber?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber?: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  notes?: string | null;
  profileImage?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingInteraction {
  id: string;
  title: string;
  description: string;
  channel: string;
  interactionType: string;
  sentAt: string;
}

export interface OrderHistory {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  orderedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  customerType: CustomerType;
  address?: string;
}

export interface UpdateCustomerStatusInput {
  status: CustomerStatus;
}

export interface UpdateCustomerTypeInput {
  customerType: CustomerType;
}

export interface UpdateCustomerNotesInput {
  notes: string;
}
