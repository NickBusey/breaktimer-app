import { useEffect, useState } from "react";
import { CalendarInfo } from "../../../types/calendar";
import { Settings } from "../../../types/settings";
import { Switch } from "@/components/ui/switch";
import SettingsCard from "./settings-card";

interface CalendarCardProps {
  settingsDraft: Settings;
  onSwitchChange: (field: string, checked: boolean) => void;
  onExcludedCalendarsChange: (excludedCalendarIds: string[]) => void;
}

export default function CalendarCard({
  settingsDraft,
  onSwitchChange,
  onExcludedCalendarsChange,
}: CalendarCardProps) {
  const supported = processPlatform === "darwin";
  const [calendars, setCalendars] = useState<CalendarInfo[] | null>(null);

  useEffect(() => {
    if (!supported) {
      return;
    }

    let active = true;
    setCalendars(null);

    ipcRenderer
      .invokeGetCalendars(settingsDraft.pauseDuringMeetings)
      .then((result) => {
        if (active) {
          setCalendars(result as CalendarInfo[]);
        }
      })
      .catch(() => {
        if (active) {
          setCalendars([]);
        }
      });

    return () => {
      active = false;
    };
  }, [supported, settingsDraft.pauseDuringMeetings]);

  const handleCalendarToggle = (id: string, included: boolean): void => {
    const excluded = new Set(settingsDraft.excludedCalendarIds);
    if (included) {
      excluded.delete(id);
    } else {
      excluded.add(id);
    }
    onExcludedCalendarsChange(Array.from(excluded));
  };

  return (
    <SettingsCard
      title="Pause during meetings"
      helperText={
        supported
          ? "Pause automatic breaks while a calendar event is in progress. Only events on enabled calendars count. macOS will ask for calendar access the first time this runs. If access was denied, enable BreakTimer under System Settings → Privacy & Security → Calendars."
          : "Calendar integration is only available on macOS."
      }
      toggle={{
        checked: settingsDraft.pauseDuringMeetings,
        onCheckedChange: (checked) =>
          onSwitchChange("pauseDuringMeetings", checked),
        disabled: !supported || !settingsDraft.breaksEnabled,
      }}
    >
      {supported && calendars !== null && calendars.length > 0 && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          {calendars.map((calendar) => (
            <div
              key={calendar.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{calendar.title}</p>
                {calendar.source && (
                  <p className="truncate text-xs text-muted-foreground">
                    {calendar.source}
                  </p>
                )}
              </div>
              <Switch
                aria-label={`Include ${calendar.title} in meeting detection`}
                checked={
                  !settingsDraft.excludedCalendarIds.includes(calendar.id)
                }
                onCheckedChange={(checked) =>
                  handleCalendarToggle(calendar.id, checked)
                }
                disabled={
                  !settingsDraft.breaksEnabled ||
                  !settingsDraft.pauseDuringMeetings
                }
              />
            </div>
          ))}
        </div>
      )}
      {supported &&
        calendars !== null &&
        calendars.length === 0 &&
        settingsDraft.pauseDuringMeetings && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
            No calendars available. Check that BreakTimer has calendar access in
            System Settings.
          </p>
        )}
    </SettingsCard>
  );
}
