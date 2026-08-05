"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RecurrenceDay, ScheduleType } from "@/types/campaign";

const DAYS: RecurrenceDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CampaignSchedulePickerProps {
  scheduleType: ScheduleType;
  onScheduleTypeChange: (type: ScheduleType) => void;
  recurrenceDays: RecurrenceDay[];
  onRecurrenceDaysChange: (days: RecurrenceDay[]) => void;
  startDate?: string;
  onStartDateChange: (date: string) => void;
  endDate?: string;
  onEndDateChange: (date: string) => void;
}

export function CampaignSchedulePicker({
  scheduleType,
  onScheduleTypeChange,
  recurrenceDays,
  onRecurrenceDaysChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: CampaignSchedulePickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Schedule Options</Label>
        <div className="flex gap-2 mt-1.5">
          {(["SendNow", "Scheduled", "Recurring"] as ScheduleType[]).map((st) => (
            <Button
              type="button"
              key={st}
              variant={scheduleType === st ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => onScheduleTypeChange(st)}
            >
              {st === "SendNow" ? "Send Now" : st}
            </Button>
          ))}
        </div>
      </div>

      {scheduleType === "Recurring" && (
        <div className="space-y-2 border border-border rounded-lg p-3">
          <Label className="text-xs font-semibold">Recurring Days (Mon/Tue/Wed)</Label>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label key={day} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox
                  checked={recurrenceDays.includes(day)}
                  onCheckedChange={(checked) => {
                    const updated = checked
                      ? [...recurrenceDays, day]
                      : recurrenceDays.filter((d) => d !== day);
                    onRecurrenceDaysChange(updated);
                  }}
                />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
      )}

      {scheduleType !== "SendNow" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input
              type="datetime-local"
              value={startDate ?? ""}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input
              type="datetime-local"
              value={endDate ?? ""}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}
