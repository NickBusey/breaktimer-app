import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import moment from "moment";
import { useEffect, useState } from "react";
import { BreakEvent } from "../../../types/breaks";
import { CalendarMeeting } from "../../../types/calendar";
import { BreakSchedule } from "../../../types/settings";
import {
  BREAK_ACTIVITY_WINDOW_MS,
  BreakChartEvent,
  BreakSparkline,
} from "./break-sparkline";
import { formatBreakLength, formatTimeSinceLastBreak } from "./utils";

const GRACE_PERIOD_MS = 60000;
const TOTAL_COUNTDOWN_MS = 120000;

interface BreakNotificationProps {
  schedules: BreakSchedule[];
  onCountdownOver: () => void;
  onPostponeBreak: () => void;
  onSkipBreak: () => void;
  onStartBreakNow: () => void;
  postponeBreakEnabled: boolean;
  skipBreakEnabled: boolean;
  timeSinceLastBreak: number | null;
  breakTitle: string;
  breakLengthSeconds: number;
  maxBreakLengthSeconds: number;
  textColor: string;
  backgroundColor: string;
}

export function BreakNotification({
  schedules,
  onCountdownOver,
  onPostponeBreak,
  onSkipBreak,
  onStartBreakNow,
  postponeBreakEnabled,
  skipBreakEnabled,
  timeSinceLastBreak,
  breakTitle,
  breakLengthSeconds,
  maxBreakLengthSeconds,
  textColor,
  backgroundColor,
}: BreakNotificationProps) {
  const [phase, setPhase] = useState<"grace" | "countdown">("grace");
  const [msRemaining, setMsRemaining] = useState<number>(0);
  const [events, setEvents] = useState<BreakChartEvent[]>([]);
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);

  useEffect(() => {
    let active = true;
    const since = Date.now() - BREAK_ACTIVITY_WINDOW_MS;

    Promise.all(
      schedules.map(async (schedule) => {
        const result = (await ipcRenderer.invokeGetBreakEvents(
          schedule.id,
          since,
        )) as BreakEvent[];
        const scheduleTitle = schedule.title?.trim() || "Break";

        return result.map((event) => ({
          ...event,
          scheduleTitle,
          lengthSeconds: event.lengthSeconds ?? schedule.lengthSeconds,
        }));
      }),
    )
      .then((groups) => {
        if (active) {
          setEvents(groups.flat().sort((a, b) => a.timestamp - b.timestamp));
        }
      })
      .catch(() => {
        // Activity history is supplementary; the popup still works without it.
      });

    ipcRenderer
      .invokeGetCalendarMeetings(since)
      .then((result) => {
        if (active) {
          setMeetings(result as CalendarMeeting[]);
        }
      })
      .catch(() => {
        // Calendar history is supplementary; the popup still works without it.
      });

    return () => {
      active = false;
    };
  }, [schedules]);

  useEffect(() => {
    const startTime = moment();
    let timeoutId: NodeJS.Timeout;

    const tick = () => {
      const now = moment();
      const elapsedMs = now.diff(startTime, "milliseconds");

      if (elapsedMs < GRACE_PERIOD_MS) {
        setPhase("grace");
      } else if (elapsedMs < TOTAL_COUNTDOWN_MS) {
        setPhase("countdown");
        setMsRemaining(TOTAL_COUNTDOWN_MS - elapsedMs);
      } else {
        onCountdownOver();
        return;
      }

      timeoutId = setTimeout(tick, 100);
    };

    tick();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [onCountdownOver]);

  const secondsRemaining = Math.ceil(msRemaining / 1000);
  const countdownDurationMs = TOTAL_COUNTDOWN_MS - GRACE_PERIOD_MS;
  const progressValue =
    phase === "countdown"
      ? ((countdownDurationMs - msRemaining) / countdownDurationMs) * 100
      : 0;
  const breakDetails = [
    breakTitle.trim(),
    breakLengthSeconds > 0 ? formatBreakLength(breakLengthSeconds) : "",
    timeSinceLastBreak ? formatTimeSinceLastBreak(timeSinceLastBreak) : "",
  ].filter(Boolean);

  return (
    <motion.div
      className="flex flex-col w-full h-full z-20 rounded-xl overflow-hidden relative"
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor,
        color: textColor,
      }}
    >
      {phase === "countdown" && (
        <div
          className="absolute inset-0 transition-all duration-75 ease-linear"
          style={{
            background: textColor,
            opacity: 0.15,
            width: `${progressValue}%`,
            left: 0,
            top: 0,
          }}
        />
      )}
      <div className="flex h-full flex-col justify-center gap-2 px-6 py-3">
        <div className="flex items-center justify-between gap-5">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ color: textColor }}
            >
              {phase === "grace"
                ? "Start your break when ready..."
                : `Break starting in ${secondsRemaining}s...`}
            </h2>
            {breakDetails.length > 0 && (
              <p
                className="truncate text-sm opacity-80 font-medium"
                style={{ color: textColor }}
              >
                {breakDetails.join(" - ")}
              </p>
            )}
          </div>

          <div className="flex shrink-0 justify-center gap-3 relative z-10">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-md"
                style={{ backgroundColor }}
              />
              <Button
                className="!bg-transparent hover:!bg-black/10 active:!bg-black/20 border-white/20 relative z-10"
                onClick={onStartBreakNow}
                variant="outline"
                style={{
                  color: textColor,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                Start
              </Button>
            </div>
            {postponeBreakEnabled && (
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-md"
                  style={{ backgroundColor }}
                />
                <Button
                  className="!bg-transparent hover:!bg-black/10 active:!bg-black/20 border-white/20 relative z-10"
                  onClick={onPostponeBreak}
                  variant="outline"
                  style={{
                    color: textColor,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  Snooze
                </Button>
              </div>
            )}
            {skipBreakEnabled && (
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-md"
                  style={{ backgroundColor }}
                />
                <Button
                  className="!bg-transparent hover:!bg-black/10 active:!bg-black/20 border-white/20 relative z-10"
                  onClick={onSkipBreak}
                  variant="outline"
                  style={{
                    color: textColor,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  Skip
                </Button>
              </div>
            )}
          </div>
        </div>
        <BreakSparkline
          events={events}
          meetings={meetings}
          maxBreakLengthSeconds={maxBreakLengthSeconds}
        />
      </div>
    </motion.div>
  );
}
