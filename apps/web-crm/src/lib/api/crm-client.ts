import {
  Customer,
  CustomerListItem,
  CreateCustomerInput,
  UpdateCustomerStatusInput,
  UpdateCustomerTypeInput,
  UpdateCustomerNotesInput,
  MarketingInteraction,
  OrderHistory,
  PaginatedResponse,
} from "@/types/customer";
import { Message } from "@/types/message";
import {
  Campaign,
  CampaignListItem,
  CreateCampaignInput,
  UpdateCampaignInput,
  Template,
} from "@/types/campaign";
import {
  Promotion,
  PromotionListItem,
  CreatePromotionInput,
  UpdatePromotionInput,
} from "@/types/promotion";
import {
  Ticket,
  TicketListItem,
  CreateTicketInput,
  PaginatedTicketResponse,
} from "@/types/ticket";

const CRM_BASE = process.env.NEXT_PUBLIC_CRM_API_URL ?? "https://localhost:7001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${CRM_BASE}${path}`;
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };

  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let token: string | undefined;
  if (typeof window === "undefined") {
    const { auth } = await import("@/auth");
    const session = await auth();
    token = session?.accessToken;
  } else {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    token = session?.accessToken;
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parse errors for non-JSON responses
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

export const crmClient = {
  customers: {
    list: (page = 1, pageSize = 20, customerType?: string, search?: string) => {
      let url = `/api/v1/customers?page=${page}&pageSize=${pageSize}`;
      if (customerType) {
        url += `&customerType=${encodeURIComponent(customerType)}`;
      }
      if (search) {
        url += `&searchTerm=${encodeURIComponent(search)}`;
      }
      return request<PaginatedResponse<CustomerListItem>>(url);
    },
    getById: (id: string) =>
      request<Customer>(`/api/v1/customers/${id}`),
    create: (body: CreateCustomerInput) =>
      request<Customer>(`/api/v1/customers`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      request<void>(`/api/v1/customers/${id}`, {
        method: "DELETE",
      }),
    updateStatus: (id: string, body: UpdateCustomerStatusInput) =>
      request<void>(`/api/v1/customers/${id}/status`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateType: (id: string, body: UpdateCustomerTypeInput) =>
      request<void>(`/api/v1/customers/${id}/type`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateNotes: (id: string, body: UpdateCustomerNotesInput) =>
      request<void>(`/api/v1/customers/${id}/notes`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
  },
  orders: {
    listByCustomer: (customerId: string) =>
      request<OrderHistory[]>(`/api/v1/customers/${customerId}/orders`),
  },
  marketingInteractions: {
    listByCustomer: (customerId: string, page = 1, pageSize = 10) =>
      request<PaginatedResponse<MarketingInteraction>>(
        `/api/v1/customers/${customerId}/marketing-interactions?page=${page}&pageSize=${pageSize}`
      ),
  },
  campaigns: {
    list: (status?: string) => {
      let url = `/api/v1/campaigns`;
      if (status && status !== "All") {
        url += `?status=${encodeURIComponent(status)}`;
      }
      return request<CampaignListItem[]>(url);
    },
    getById: (id: string) =>
      request<Campaign>(`/api/v1/campaigns/${id}`),
    create: (body: CreateCampaignInput) =>
      request<Campaign>(`/api/v1/campaigns`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdateCampaignInput) =>
      request<void>(`/api/v1/campaigns/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateStatus: (id: string, status: string) =>
      request<void>(`/api/v1/campaigns/${id}/status?status=${encodeURIComponent(status)}`, {
        method: "PUT",
      }),
    attachPromotions: (id: string, promotionIds: string[]) =>
      request<void>(`/api/v1/campaigns/${id}/promotions`, {
        method: "POST",
        body: JSON.stringify({ promotionIds }),
      }),
    send: (id: string) =>
      request<{ message: string; sentCount: number }>(`/api/v1/campaigns/${id}/send`, {
        method: "POST",
      }),
    delete: (id: string) =>
      request<void>(`/api/v1/campaigns/${id}`, {
        method: "DELETE",
      }),
  },
  promotions: {
    list: (status?: string) => {
      let url = `/api/v1/promotions`;
      if (status && status !== "All") {
        url += `?status=${encodeURIComponent(status)}`;
      }
      return request<PromotionListItem[]>(url);
    },
    getById: (id: string) =>
      request<Promotion>(`/api/v1/promotions/${id}`),
    create: (body: CreatePromotionInput) =>
      request<Promotion>(`/api/v1/promotions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    update: (id: string, body: UpdatePromotionInput) =>
      request<void>(`/api/v1/promotions/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    updateStatus: (id: string, status: string) =>
      request<void>(`/api/v1/promotions/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    cancel: (id: string) =>
      request<void>(`/api/v1/promotions/${id}/cancel`, {
        method: "DELETE",
      }),
  },
  templates: {
    list: (channel?: string) => {
      let url = `/api/v1/templates`;
      if (channel) {
        url += `?channel=${encodeURIComponent(channel)}`;
      }
      return request<Template[]>(url);
    },
    getById: (id: string) =>
      request<Template>(`/api/v1/templates/${id}`),
  },
  tickets: {
    list: (page = 1, pageSize = 20, status?: string, assignedToIdOrCustomerId?: string) => {
      let url = `/api/v1/tickets?page=${page}&pageSize=${pageSize}`;
      if (status && status !== "All") {
        url += `&status=${encodeURIComponent(status)}`;
      }
      if (assignedToIdOrCustomerId) {
        url += `&assignedToId=${encodeURIComponent(assignedToIdOrCustomerId)}`;
      }
      return request<PaginatedTicketResponse>(url);
    },
    getById: (id: string) =>
      request<Ticket>(`/api/v1/tickets/${id}`),
    create: (body: CreateTicketInput, customerId: string) =>
      request<Ticket>(`/api/v1/tickets?customerId=${encodeURIComponent(customerId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    claim: (id: string, staffUserId: string) =>
      request<void>(`/api/v1/tickets/${id}/claim?staffUserId=${encodeURIComponent(staffUserId)}`, {
        method: "PUT",
      }),
    unclaim: (id: string) =>
      request<void>(`/api/v1/tickets/${id}/unclaim`, { method: "PUT" }),
    updateStatus: (id: string, status: string) =>
      request<void>(`/api/v1/tickets/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    cancel: (id: string) =>
      request<void>(`/api/v1/tickets/${id}`, {
        method: "DELETE",
      }),
  },
  messages: {
    listByTicket: (ticketId: string) =>
      request<Message[]>(`/api/v1/tickets/${ticketId}/messages`),
    markRead: (ticketId: string, messageId: string) =>
      request<void>(`/api/v1/tickets/${ticketId}/messages/${messageId}/read`, {
        method: "PUT",
      }),
  },
  upload: {
    uploadFile: async (file: File, folder = "general"): Promise<{ url: string }> => {
      const formData = new FormData();
      formData.append("file", file);
      return request<{ url: string }>(`/api/v1/upload?folder=${encodeURIComponent(folder)}`, {
        method: "POST",
        body: formData,
      });
    },
  },
};
