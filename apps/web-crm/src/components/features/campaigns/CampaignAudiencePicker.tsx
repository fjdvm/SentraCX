"use client";

import React, { useState, useMemo } from "react";
import { Search, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/useCustomers";

interface CampaignAudiencePickerProps {
  targetAudience: string;
  onAudienceChange: (value: string) => void;
  selectedCustomerIds: string[];
  onSelectedCustomerIdsChange: (updater: (prev: string[]) => string[]) => void;
  customEmailsText: string;
  onCustomEmailsTextChange: (value: string) => void;
}

export function CampaignAudiencePicker({
  targetAudience,
  onAudienceChange,
  selectedCustomerIds,
  onSelectedCustomerIdsChange,
  customEmailsText,
  onCustomEmailsTextChange,
}: CampaignAudiencePickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { customers, isLoading } = useCustomers({ customerType: "Contact", pageSize: 100 });

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const lower = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.displayName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower)
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="target-audience-select">Target Audience</Label>
        <select
          id="target-audience-select"
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background mt-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          value={targetAudience || "All"}
          onChange={(e) => onAudienceChange(e.target.value)}
        >
          <option value="All">All Active Contacts</option>
          <option value="Regular">Regular Customers Only</option>
          <option value="InstitutionalBuyer">Institutional Buyers Only</option>
          <option value="Specific">Specific Customers / Emails</option>
        </select>
      </div>

      {targetAudience === "Specific" && (
        <div className="space-y-4 border border-border rounded-lg p-3 bg-muted/10">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Select Specific Customer Contacts
              </Label>
              {selectedCustomerIds.length > 0 && (
                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {selectedCustomerIds.length} selected
                </span>
              )}
            </div>

            {/* Search Bar for Specific Email Selection */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search contacts by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto pr-1 border rounded p-2 bg-background">
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Loading contacts...</p>
              ) : filteredCustomers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {searchTerm ? "No matching contacts found." : "No contacts available."}
                </p>
              ) : (
                    filteredCustomers.map((c) => {
                      const checked = selectedCustomerIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                onSelectedCustomerIdsChange((prev) =>
                                  isChecked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                                );
                              }}
                              className="h-3.5 w-3.5 rounded border-muted-foreground/30 accent-primary cursor-pointer"
                            />
                            <span className="font-medium text-foreground truncate">{c.displayName}</span>
                          </div>
                          <span className="text-muted-foreground text-[11px] shrink-0 ml-2 font-mono">{c.email}</span>
                        </label>
                      );
                    })
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Additional Specific Email Addresses (Typed)</Label>
            <Textarea
              rows={2}
              placeholder="Enter emails separated by commas or new lines, e.g. john@company.com, partner@org.com"
              value={customEmailsText}
              onChange={(e) => onCustomEmailsTextChange(e.target.value)}
              className="text-xs font-mono"
            />
            <span className="text-[11px] text-muted-foreground block">
              Type any extra specific email addresses here to receive the campaign.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
