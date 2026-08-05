export type CampaignStatus = "Draft" | "Active" | "Ended";
export type CampaignChannel = "Email" | "InApp";
export type ScheduleType = "SendNow" | "Scheduled" | "Recurring";
export type RecurrenceDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface CampaignSchedule {
  scheduleType: ScheduleType;
  recurrenceDays?: RecurrenceDay[];
  startDate?: string | null;
  endDate?: string | null;
}

export interface CampaignListItem {
  id: string;
  title: string;
  channels: CampaignChannel[];
  targetAudience?: string;
  targetCustomerIds?: string[];
  targetEmails?: string[];
  status: CampaignStatus;
  createdAt: string;
}

export interface Campaign extends CampaignListItem {
  subject: string;
  description: string;
  templateId?: string | null;
  imageUrl?: string | null;
  createdById?: string;
  schedule?: CampaignSchedule | null;
}

export interface CreateCampaignInput {
  title: string;
  subject: string;
  description: string;
  channels: CampaignChannel[];
  targetAudience?: string;
  targetCustomerIds?: string[];
  targetEmails?: string[];
  scheduleType: ScheduleType;
  recurrenceDays?: RecurrenceDay[];
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  templateId?: string;
  status?: CampaignStatus;
}

export interface UpdateCampaignInput {
  title?: string;
  subject?: string;
  description?: string;
  channels?: CampaignChannel[];
  targetAudience?: string;
  targetCustomerIds?: string[];
  targetEmails?: string[];
  scheduleType?: ScheduleType;
  recurrenceDays?: RecurrenceDay[];
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  templateId?: string;
  status?: CampaignStatus;
}

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  contentHtml: string;
  thumbnailUrl?: string | null;
  channel: string;
  createdAt: string;
}

export interface CampaignDispatchResult {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

