import { formatConversationTime } from "@/lib/format-conversation-time";

describe("formatConversationTime", () => {
  it("returns empty string for invalid date", () => {
    expect(formatConversationTime("invalid-date")).toBe("");
  });

  it("formats time for today", () => {
    const today = new Date();
    today.setHours(14, 30, 0, 0);
    const result = formatConversationTime(today.toISOString());
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("formats 'Yesterday' for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);
    const result = formatConversationTime(yesterday.toISOString());
    expect(result).toBe("Yesterday");
  });

  it("formats weekday or date for older dates", () => {
    const olderDate = new Date();
    olderDate.setDate(olderDate.getDate() - 14);
    const result = formatConversationTime(olderDate.toISOString());
    expect(result).toBeTruthy();
    expect(result).not.toBe("Yesterday");
  });
});
