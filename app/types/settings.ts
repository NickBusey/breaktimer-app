export enum NotificationType {
  Notification = "NOTIFICATION",
  Popup = "POPUP",
}

export interface WorkingHoursRange {
  fromMinutes: number;
  toMinutes: number;
}

export interface WorkingHours {
  enabled: boolean;
  ranges: WorkingHoursRange[];
}

export enum SoundType {
  None = "NONE",
  Gong = "GONG",
  Blip = "BLIP",
  Bloop = "BLOOP",
  Ping = "PING",
  Scifi = "SCIFI",
}

export interface BreakSchedule {
  id: string;
  enabled: boolean;
  notificationType: NotificationType;
  frequencySeconds: number;
  lengthSeconds: number;
  title: string;
  message: string;
  // Smart breaks
  idleResetEnabled: boolean;
  idleResetLengthSeconds: number;
  idleResetNotification: boolean;
  // Snooze
  postponeBreakEnabled: boolean;
  postponeLengthSeconds: number;
  postponeLimit: number;
  // Skip
  skipBreakEnabled: boolean;
  // Advanced
  immediatelyStartBreaks: boolean;
  endBreakEnabled: boolean;
  // Theme
  backgroundColor: string;
  textColor: string;
  // Audio
  soundType: SoundType;
  breakSoundVolume: number;
  // Backdrop
  showBackdrop: boolean;
  backdropOpacity: number;
}

export interface Settings {
  autoLaunch: boolean;
  breaksEnabled: boolean;
  notificationType: NotificationType;
  breakSchedules: BreakSchedule[];
  workingHoursEnabled: boolean;
  workingHoursMonday: WorkingHours;
  workingHoursTuesday: WorkingHours;
  workingHoursWednesday: WorkingHours;
  workingHoursThursday: WorkingHours;
  workingHoursFriday: WorkingHours;
  workingHoursSaturday: WorkingHours;
  workingHoursSunday: WorkingHours;
}

export const defaultWorkingRange: WorkingHoursRange = {
  fromMinutes: 9 * 60, // 09:00
  toMinutes: 18 * 60, // 18:00
};

export const defaultSettings: Settings = {
  autoLaunch: true,
  breaksEnabled: true,
  notificationType: NotificationType.Popup,
  breakSchedules: [
    {
      id: "default",
      enabled: true,
      notificationType: NotificationType.Popup,
      frequencySeconds: 28 * 60,
      lengthSeconds: 2 * 60,
      title: "Time for a break.",
      message: "Rest your eyes.\nStretch your legs.\nBreathe. Relax.",
      idleResetEnabled: true,
      idleResetLengthSeconds: 5 * 60,
      idleResetNotification: false,
      postponeBreakEnabled: true,
      postponeLengthSeconds: 3 * 60,
      postponeLimit: 0,
      skipBreakEnabled: false,
      immediatelyStartBreaks: false,
      endBreakEnabled: true,
      backgroundColor: "#16a085",
      textColor: "#ffffff",
      soundType: SoundType.Gong,
      breakSoundVolume: 1,
      showBackdrop: true,
      backdropOpacity: 0.7,
    },
  ],
  workingHoursEnabled: true,
  workingHoursMonday: {
    enabled: true,
    ranges: [defaultWorkingRange],
  },
  workingHoursTuesday: {
    enabled: true,
    ranges: [defaultWorkingRange],
  },
  workingHoursWednesday: {
    enabled: true,
    ranges: [defaultWorkingRange],
  },
  workingHoursThursday: {
    enabled: true,
    ranges: [defaultWorkingRange],
  },
  workingHoursFriday: {
    enabled: true,
    ranges: [defaultWorkingRange],
  },
  workingHoursSaturday: {
    enabled: false,
    ranges: [defaultWorkingRange],
  },
  workingHoursSunday: {
    enabled: false,
    ranges: [defaultWorkingRange],
  },
};

export interface DayConfig {
  key:
    | "workingHoursMonday"
    | "workingHoursTuesday"
    | "workingHoursWednesday"
    | "workingHoursThursday"
    | "workingHoursFriday"
    | "workingHoursSaturday"
    | "workingHoursSunday";
  label: string;
}

export const daysConfig: DayConfig[] = [
  { key: "workingHoursMonday", label: "Monday" },
  { key: "workingHoursTuesday", label: "Tuesday" },
  { key: "workingHoursWednesday", label: "Wednesday" },
  { key: "workingHoursThursday", label: "Thursday" },
  { key: "workingHoursFriday", label: "Friday" },
  { key: "workingHoursSaturday", label: "Saturday" },
  { key: "workingHoursSunday", label: "Sunday" },
];
