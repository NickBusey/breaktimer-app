import { Moment } from "moment";

export type BreakTime = Moment | null;

export type BreakEventType = "snoozed" | "completed" | "cancelled";
export type BreakOutcome = Exclude<BreakEventType, "snoozed">;

export interface BreakEvent {
  type: BreakEventType;
  timestamp: number;
  lengthSeconds?: number;
}

export interface ActiveBreak {
  scheduleId: string;
  title: string;
  message: string;
  lengthSeconds: number;
}
