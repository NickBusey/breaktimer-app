import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import {
  BreakSchedule,
  NotificationType,
  Settings,
  SoundType,
} from "../../types/settings";
import { toast } from "../toaster";
import BreaksCard from "./settings/breaks-card";
import SettingsCard from "./settings/settings-card";
import SettingsHeader from "./settings/settings-header";
import StartupCard from "./settings/startup-card";
import WorkingHoursSettings from "./settings/working-hours";
import WelcomeModal from "./welcome-modal";

export default function SettingsEl() {
  const [settingsDraft, setSettingsDraft] = useState<Settings | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = (await ipcRenderer.invokeGetSettings()) as Settings;
      setSettingsDraft(settings);
      setSettings(settings);

      // Check if this is the first time running the app
      const appInitialized = await ipcRenderer.invokeGetAppInitialized();
      setShowWelcomeModal(!appInitialized);
    })();
  }, []);

  const dirty = useMemo(() => {
    return JSON.stringify(settingsDraft) !== JSON.stringify(settings);
  }, [settings, settingsDraft]);

  if (settings === null || settingsDraft === null) {
    return null;
  }

  const handleSwitchChange = (field: string, checked: boolean): void => {
    setSettingsDraft({
      ...settingsDraft,
      [field]: checked,
    });
  };

  const handleScheduleChange = (
    scheduleId: string,
    patch: Partial<BreakSchedule>,
  ): void => {
    setSettingsDraft({
      ...settingsDraft,
      breakSchedules: settingsDraft.breakSchedules.map((schedule) =>
        schedule.id === scheduleId ? { ...schedule, ...patch } : schedule,
      ),
    });
  };

  const handleScheduleAdd = (): void => {
    const fallbackSchedule =
      settingsDraft.breakSchedules[settingsDraft.breakSchedules.length - 1] ??
      settingsDraft.breakSchedules[0];
    const scheduleCount = settingsDraft.breakSchedules.length + 1;
    const newSchedule: BreakSchedule = {
      id: `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      enabled: true,
      notificationType:
        fallbackSchedule?.notificationType ?? NotificationType.Popup,
      frequencySeconds: fallbackSchedule?.frequencySeconds ?? 15 * 60,
      lengthSeconds: fallbackSchedule?.lengthSeconds ?? 30,
      title: `Break ${scheduleCount}`,
      message:
        fallbackSchedule?.message ??
        "Rest your eyes.\nStretch your legs.\nBreathe. Relax.",
      idleResetEnabled: fallbackSchedule?.idleResetEnabled ?? true,
      idleResetLengthSeconds:
        fallbackSchedule?.idleResetLengthSeconds ?? 5 * 60,
      idleResetNotification: fallbackSchedule?.idleResetNotification ?? false,
      postponeBreakEnabled: fallbackSchedule?.postponeBreakEnabled ?? true,
      postponeLengthSeconds: fallbackSchedule?.postponeLengthSeconds ?? 3 * 60,
      postponeLimit: fallbackSchedule?.postponeLimit ?? 0,
      skipBreakEnabled: fallbackSchedule?.skipBreakEnabled ?? false,
      immediatelyStartBreaks: fallbackSchedule?.immediatelyStartBreaks ?? false,
      endBreakEnabled: fallbackSchedule?.endBreakEnabled ?? true,
      backgroundColor: fallbackSchedule?.backgroundColor ?? "#16a085",
      textColor: fallbackSchedule?.textColor ?? "#ffffff",
      soundType: fallbackSchedule?.soundType ?? SoundType.Gong,
      breakSoundVolume: fallbackSchedule?.breakSoundVolume ?? 1,
      showBackdrop: fallbackSchedule?.showBackdrop ?? true,
      backdropOpacity: fallbackSchedule?.backdropOpacity ?? 0.7,
    };

    setSettingsDraft({
      ...settingsDraft,
      breakSchedules: [...settingsDraft.breakSchedules, newSchedule],
    });
  };

  const handleScheduleRemove = (scheduleId: string): void => {
    if (settingsDraft.breakSchedules.length <= 1) {
      return;
    }

    setSettingsDraft({
      ...settingsDraft,
      breakSchedules: settingsDraft.breakSchedules.filter(
        (schedule) => schedule.id !== scheduleId,
      ),
    });
  };

  const handleSave = async () => {
    await ipcRenderer.invokeSetSettings(settingsDraft);
    toast("Settings saved");
    setSettings(settingsDraft);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <Tabs
        defaultValue="break-settings"
        className="w-full h-full flex flex-col"
      >
        <SettingsHeader handleSave={handleSave} showSave={dirty} />
        <div className="flex-1 overflow-auto p-6 min-h-0">
          <TabsContent value="break-settings" className="m-0 space-y-8">
            <BreaksCard
              settingsDraft={settingsDraft}
              onScheduleChange={handleScheduleChange}
              onScheduleAdd={handleScheduleAdd}
              onScheduleRemove={handleScheduleRemove}
              onSwitchChange={handleSwitchChange}
            />
          </TabsContent>

          <TabsContent value="working-hours" className="m-0 space-y-6">
            <SettingsCard
              title="Working Hours"
              helperText="Only show breaks during your configured work schedule."
              toggle={{
                checked: settingsDraft.workingHoursEnabled,
                onCheckedChange: (checked) =>
                  handleSwitchChange("workingHoursEnabled", checked),
                disabled: !settingsDraft.breaksEnabled,
              }}
            >
              <WorkingHoursSettings
                settingsDraft={settingsDraft}
                setSettingsDraft={setSettingsDraft}
              />
            </SettingsCard>
          </TabsContent>

          {processEnv.SNAP === undefined && (
            <TabsContent value="system" className="m-0 space-y-6">
              <StartupCard
                settingsDraft={settingsDraft}
                onSwitchChange={handleSwitchChange}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
      <WelcomeModal
        open={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
    </div>
  );
}
