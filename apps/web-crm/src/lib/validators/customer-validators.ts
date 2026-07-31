import { z } from "zod";

export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Valid email address is required"),
  phoneNumber: z.string().optional(),
  customerType: z.enum(["Regular", "InstitutionalBuyer"]),
  address: z.string().optional(),
});

export type CreateCustomerFormInput = z.infer<typeof createCustomerSchema>;
