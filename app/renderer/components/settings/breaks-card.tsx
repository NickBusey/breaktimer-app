import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDownIcon } from "lucide-react";
import {
  BreakSchedule,
  NotificationType,
  Settings,
  SoundType,
} from "../../../types/settings";
import { SoundSelect } from "../sound-select";
import SettingsCard from "./settings-card";
import TimeInput from "./time-input";

interface BreaksCardProps {
  settingsDraft: Settings;
  onScheduleChange: (scheduleId: string, patch: Partial<BreakSchedule>) => void;
  onScheduleAdd: () => void;
  onScheduleRemove: (scheduleId: string) => void;
  onSwitchChange: (field: string, checked: boolean) => void;
}

export default function BreaksCard({
  settingsDraft,
  onScheduleChange,
  onScheduleAdd,
  onScheduleRemove,
  onSwitchChange,
}: BreaksCardProps) {
  const canEditSchedules = settingsDraft.breaksEnabled;

  return (
    <SettingsCard
      title="Breaks"
      toggle={{
        checked: settingsDraft.breaksEnabled,
        onCheckedChange: (checked) => onSwitchChange("breaksEnabled", checked),
      }}
    >
      <div className="space-y-4">
        <div className="space-y-4">
          {settingsDraft.breakSchedules.map((schedule, index) => {
            const scheduleDisabled =
              !settingsDraft.breaksEnabled || !schedule.enabled;
            const lengthDisabled =
              scheduleDisabled ||
              schedule.notificationType !== NotificationType.Popup;
            const scheduleLabel =
              schedule.title?.trim() || `Break ${index + 1}`;

            return (
              <div
                key={schedule.id}
                className="rounded-md border border-border bg-background p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{scheduleLabel}</div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, { enabled: checked })
                      }
                      disabled={!settingsDraft.breaksEnabled}
                    />
                    {settingsDraft.breakSchedules.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onScheduleRemove(schedule.id)}
                        disabled={!canEditSchedules}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Type</Label>
                    <Select
                      value={schedule.notificationType}
                      onValueChange={(value) =>
                        onScheduleChange(schedule.id, {
                          notificationType: value as NotificationType,
                        })
                      }
                      disabled={scheduleDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NotificationType.Popup}>
                          Popup break
                        </SelectItem>
                        <SelectItem value={NotificationType.Notification}>
                          Simple notification
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Frequency</Label>
                    <TimeInput
                      precision="seconds"
                      value={schedule.frequencySeconds}
                      onChange={(seconds) =>
                        onScheduleChange(schedule.id, {
                          frequencySeconds: seconds,
                        })
                      }
                      disabled={scheduleDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Length</Label>
                    <TimeInput
                      precision="seconds"
                      value={schedule.lengthSeconds}
                      onChange={(seconds) =>
                        onScheduleChange(schedule.id, {
                          lengthSeconds: seconds,
                        })
                      }
                      disabled={lengthDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Title</Label>
                    <Input
                      className="text-sm"
                      value={schedule.title}
                      onChange={(event) =>
                        onScheduleChange(schedule.id, {
                          title: event.target.value,
                        })
                      }
                      disabled={scheduleDisabled}
                      placeholder={`Break ${index + 1}`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Message</Label>
                  <Textarea
                    className="text-sm resize-none"
                    rows={3}
                    value={schedule.message}
                    onChange={(event) =>
                      onScheduleChange(schedule.id, {
                        message: event.target.value,
                      })
                    }
                    disabled={scheduleDisabled}
                    placeholder="Enter your break message..."
                  />
                </div>

                {/* Smart breaks */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Smart breaks</div>
                      <div className="text-xs text-muted-foreground">
                        Automatically detect natural breaks and reset the break
                        timer.
                      </div>
                    </div>
                    <Switch
                      checked={schedule.idleResetEnabled}
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, {
                          idleResetEnabled: checked,
                        })
                      }
                      disabled={scheduleDisabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Minimum idle time
                    </Label>
                    <TimeInput
                      precision="seconds"
                      value={schedule.idleResetLengthSeconds}
                      onChange={(seconds) =>
                        onScheduleChange(schedule.id, {
                          idleResetLengthSeconds: seconds,
                        })
                      }
                      disabled={scheduleDisabled || !schedule.idleResetEnabled}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedule.idleResetNotification}
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, {
                          idleResetNotification: checked,
                        })
                      }
                      disabled={scheduleDisabled || !schedule.idleResetEnabled}
                    />
                    <Label className="text-sm">
                      Show notification when break automatically detected
                    </Label>
                  </div>
                </div>

                {/* Snooze */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Snooze</div>
                      <div className="text-xs text-muted-foreground">
                        Snoozing allows you to postpone breaks when busy.
                      </div>
                    </div>
                    <Switch
                      checked={
                        schedule.postponeBreakEnabled &&
                        !schedule.immediatelyStartBreaks
                      }
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, {
                          postponeBreakEnabled: checked,
                        })
                      }
                      disabled={
                        scheduleDisabled || schedule.immediatelyStartBreaks
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Length</Label>
                      <TimeInput
                        precision="seconds"
                        value={schedule.postponeLengthSeconds}
                        onChange={(seconds) =>
                          onScheduleChange(schedule.id, {
                            postponeLengthSeconds: seconds,
                          })
                        }
                        disabled={
                          scheduleDisabled ||
                          !schedule.postponeBreakEnabled ||
                          schedule.immediatelyStartBreaks
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Limit</Label>
                      <Select
                        value={schedule.postponeLimit.toString()}
                        onValueChange={(value) =>
                          onScheduleChange(schedule.id, {
                            postponeLimit: Number(value),
                          })
                        }
                        disabled={
                          scheduleDisabled ||
                          !schedule.postponeBreakEnabled ||
                          schedule.immediatelyStartBreaks
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="0">No limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Skip */}
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Skip</div>
                      <div className="text-xs text-muted-foreground">
                        Allow skipping breaks entirely without rescheduling
                        them.
                      </div>
                    </div>
                    <Switch
                      checked={
                        schedule.skipBreakEnabled &&
                        !schedule.immediatelyStartBreaks
                      }
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, {
                          skipBreakEnabled: checked,
                        })
                      }
                      disabled={
                        scheduleDisabled || schedule.immediatelyStartBreaks
                      }
                    />
                  </div>
                </div>

                {/* Advanced */}
                <div className="border-t pt-4 space-y-4">
                  <div className="text-sm font-semibold">Advanced</div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedule.immediatelyStartBreaks}
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, {
                          immediatelyStartBreaks: checked,
                        })
                      }
                      disabled={
                        scheduleDisabled ||
                        schedule.notificationType !== NotificationType.Popup
                      }
                    />
                    <Label className="text-sm">Immediately start breaks</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedule.endBreakEnabled}
                      onCheckedChange={(checked) =>
                        onScheduleChange(schedule.id, {
                          endBreakEnabled: checked,
                        })
                      }
                      disabled={
                        scheduleDisabled ||
                        schedule.notificationType !== NotificationType.Popup
                      }
                    />
                    <Label className="text-sm">Allow ending break early</Label>
                  </div>
                </div>

                {/* Customization */}
                <Collapsible defaultOpen={false} className="border-t pt-4">
                  <CollapsibleTrigger className="group flex items-center justify-between w-full">
                    <span className="text-sm font-semibold">Customization</span>
                    <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    {/* Theme */}
                    <div
                      className="rounded-lg border p-4 space-y-2"
                      style={{
                        backgroundColor: schedule.backgroundColor,
                        borderColor: `${schedule.textColor}4D`,
                        color: schedule.textColor,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="text-sm font-semibold"
                          style={{ color: schedule.textColor }}
                        >
                          Theme
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            onScheduleChange(schedule.id, {
                              backgroundColor: "#16a085",
                              textColor: "#ffffff",
                              backdropOpacity: 0.7,
                            })
                          }
                          disabled={scheduleDisabled}
                          style={{ color: schedule.textColor }}
                        >
                          Reset colors
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label
                            className="text-sm font-medium"
                            style={{ color: schedule.textColor }}
                          >
                            Primary color
                          </Label>
                          <input
                            className="w-20 h-10 rounded cursor-pointer border appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded"
                            style={{
                              backgroundColor: schedule.backgroundColor,
                              borderColor: `${schedule.textColor}4D`,
                            }}
                            type="color"
                            value={schedule.backgroundColor}
                            onChange={(event) =>
                              onScheduleChange(schedule.id, {
                                backgroundColor: event.target.value,
                              })
                            }
                            disabled={scheduleDisabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            className="text-sm font-medium"
                            style={{ color: schedule.textColor }}
                          >
                            Text color
                          </Label>
                          <input
                            className="w-20 h-10 rounded cursor-pointer border appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded"
                            style={{
                              backgroundColor: schedule.textColor,
                              borderColor: `${schedule.textColor}4D`,
                            }}
                            type="color"
                            value={schedule.textColor}
                            onChange={(event) =>
                              onScheduleChange(schedule.id, {
                                textColor: event.target.value,
                              })
                            }
                            disabled={scheduleDisabled}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Audio */}
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">Audio</div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Break sound
                          </Label>
                          <SoundSelect
                            value={schedule.soundType}
                            onChange={(soundType: SoundType) =>
                              onScheduleChange(schedule.id, { soundType })
                            }
                            volume={schedule.breakSoundVolume}
                            disabled={scheduleDisabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">
                            Break sound volume
                          </Label>
                          <div className="px-2">
                            <Slider
                              min={0}
                              max={1}
                              step={0.01}
                              value={[schedule.breakSoundVolume]}
                              onValueChange={(values) =>
                                onScheduleChange(schedule.id, {
                                  breakSoundVolume: values[0],
                                })
                              }
                              disabled={scheduleDisabled}
                            />
                            <div className="flex justify-between text-sm text-muted-foreground mt-1">
                              <span>0%</span>
                              <span>
                                {Math.round(schedule.breakSoundVolume * 100)}%
                              </span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Backdrop */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold">Backdrop</div>
                          <div className="text-xs text-muted-foreground">
                            Show a colored overlay behind break windows to limit
                            distractions.
                          </div>
                        </div>
                        <Switch
                          checked={schedule.showBackdrop}
                          onCheckedChange={(checked) =>
                            onScheduleChange(schedule.id, {
                              showBackdrop: checked,
                            })
                          }
                          disabled={
                            scheduleDisabled ||
                            schedule.notificationType !== NotificationType.Popup
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Opacity</Label>
                        <div className="px-2">
                          <Slider
                            min={0.2}
                            max={1}
                            step={0.05}
                            value={[schedule.backdropOpacity]}
                            onValueChange={(values) =>
                              onScheduleChange(schedule.id, {
                                backdropOpacity: values[0],
                              })
                            }
                            disabled={
                              scheduleDisabled || !schedule.showBackdrop
                            }
                          />
                          <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>20%</span>
                            <span>
                              {Math.round(schedule.backdropOpacity * 100)}%
                            </span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}

          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onScheduleAdd}
              disabled={!canEditSchedules}
            >
              Add break
            </Button>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
