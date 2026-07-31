import { createCustomerSchema } from "@/lib/validators/customer-validators";

describe("createCustomerSchema", () => {
  const validInput = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    customerType: "Regular" as const,
  };

  it("accepts a valid Regular customer", () => {
    const result = createCustomerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts an InstitutionalBuyer customer type", () => {
    const result = createCustomerSchema.safeParse({
      ...validInput,
      customerType: "InstitutionalBuyer",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional phoneNumber", () => {
    const result = createCustomerSchema.safeParse({
      ...validInput,
      phoneNumber: "+1-555-000-0001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing firstName", () => {
    const { firstName: _, ...rest } = validInput;
    const result = createCustomerSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty firstName", () => {
    const result = createCustomerSchema.safeParse({ ...validInput, firstName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("First name is required");
    }
  });

  it("rejects empty lastName", () => {
    const result = createCustomerSchema.safeParse({ ...validInput, lastName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Last name is required");
    }
  });

  it("rejects an invalid email", () => {
    const result = createCustomerSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Valid email address is required");
    }
  });

  it("rejects a VIP customer type", () => {
    const result = createCustomerSchema.safeParse({
      ...validInput,
      customerType: "VIP",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a Lead customer type", () => {
    const result = createCustomerSchema.safeParse({
      ...validInput,
      customerType: "Lead",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an optional address", () => {
    const result = createCustomerSchema.safeParse({
      ...validInput,
      address: "123 Test St",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid customerType", () => {
    const result = createCustomerSchema.safeParse({ ...validInput, customerType: "SuperVIP" });
    expect(result.success).toBe(false);
  });

  it("omits undefined phoneNumber from parsed output", () => {
    const result = createCustomerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phoneNumber).toBeUndefined();
    }
  });
});
