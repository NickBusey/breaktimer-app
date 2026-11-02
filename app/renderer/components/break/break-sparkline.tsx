import moment from "moment";
import { BreakEvent, BreakEventType } from "../../../types/breaks";
import { CalendarMeeting } from "../../../types/calendar";

export const BREAK_ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = BREAK_ACTIVITY_WINDOW_MS;
const CHART_VIEWBOX_WIDTH = 1000;
const CHART_HEIGHT = 32;
const CENTER_Y = CHART_HEIGHT / 2;
const MIN_TICK_HEIGHT = 6;
const MAX_TICK_HEIGHT = 24;
const HORIZONTAL_PADDING = 2;
const INNER_WIDTH = CHART_VIEWBOX_WIDTH - HORIZONTAL_PADDING * 2;

const EVENT_COLORS: Record<BreakEventType, string> = {
  snoozed: "#facc15",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

function formatSpan(spanMs: number): string {
  if (spanMs < 60_000) {
    return `${Math.max(1, Math.round(spanMs / 1000))}s`;
  }

  const minutes = Math.round(spanMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  return `${Math.round(minutes / 60)}h`;
}

export interface BreakChartEvent extends BreakEvent {
  scheduleTitle: string;
  lengthSeconds: number;
}

interface BreakSparklineProps {
  events: BreakChartEvent[];
  meetings: CalendarMeeting[];
  maxBreakLengthSeconds: number;
}

export function BreakSparkline({
  events,
  meetings,
  maxBreakLengthSeconds,
}: BreakSparklineProps) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const visibleEvents = events.filter(
    (event) => event.timestamp >= windowStart && event.timestamp <= now,
  );
  const visibleMeetings = meetings
    .map((meeting) => ({
      start: Math.max(meeting.start, windowStart),
      end: Math.min(meeting.end, now),
    }))
    .filter((meeting) => meeting.end > meeting.start);

  // Include meeting boundaries so the gray blocks that explain break gaps stay
  // inside the visible span.
  const domainPoints = [
    ...visibleEvents.map((event) => event.timestamp),
    ...visibleMeetings.flatMap((meeting) => [meeting.start, meeting.end]),
  ];
  const firstTimestamp = domainPoints.reduce(
    (min, timestamp) => Math.min(min, timestamp),
    Infinity,
  );
  const lastTimestamp = domainPoints.reduce(
    (max, timestamp) => Math.max(max, timestamp),
    -Infinity,
  );
  const spanMs = domainPoints.length >= 2 ? lastTimestamp - firstTimestamp : 0;
  const autoScale = spanMs > 0;
  const domainStart = autoScale ? firstTimestamp : windowStart;
  const domainEnd = autoScale ? lastTimestamp : now;
  const domainSpanMs = domainEnd - domainStart;
  const spanLabel = autoScale ? formatSpan(spanMs) : "24h";
  const ariaLabel = autoScale
    ? `Break activity from all schedules over the last 24 hours, scaled to a ${spanLabel} span; gray blocks are calendar meetings; marker height indicates break length: yellow snoozed, green completed, red cancelled`
    : "Break activity from all schedules over the last 24 hours; gray blocks are calendar meetings; marker height indicates break length: yellow snoozed, green completed, red cancelled";

  const getX = (timestamp: number): number => {
    const progress = (timestamp - domainStart) / domainSpanMs;
    return HORIZONTAL_PADDING + progress * INNER_WIDTH;
  };

  return (
    <div
      className="flex w-full items-center gap-2 rounded-md px-4 py-2"
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #333333 100%)",
      }}
      title={
        autoScale
          ? `Events and meetings from all schedules in the last 24 hours, scaled to the ${spanLabel} span`
          : "Break activity and meetings from all schedules over the last 24 hours"
      }
    >
      <svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="min-w-0 flex-1 overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        {visibleMeetings.map((meeting, index) => {
          const x1 = getX(meeting.start);
          const x2 = getX(meeting.end);

          return (
            <g key={`meeting-${meeting.start}-${meeting.end}-${index}`}>
              <title>
                {`Meeting ${moment(meeting.start).format(
                  "ddd HH:mm",
                )}–${moment(meeting.end).format("HH:mm")}`}
              </title>
              <rect
                x={x1}
                y={0}
                width={Math.max(1, x2 - x1)}
                height={CHART_HEIGHT}
                fill="rgba(148, 163, 184, 0.28)"
              />
            </g>
          );
        })}
        <line
          x1={HORIZONTAL_PADDING}
          y1={CENTER_Y}
          x2={CHART_VIEWBOX_WIDTH - HORIZONTAL_PADDING}
          y2={CENTER_Y}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {visibleEvents.map((event, index) => {
          const x = getX(event.timestamp);
          const lengthSeconds = event.lengthSeconds;
          const lengthRatio = Math.min(
            1,
            Math.max(0, lengthSeconds / Math.max(maxBreakLengthSeconds, 1)),
          );
          const tickHeight =
            MIN_TICK_HEIGHT + lengthRatio * (MAX_TICK_HEIGHT - MIN_TICK_HEIGHT);
          const halfTick = tickHeight / 2;

          return (
            <g key={`${event.type}-${event.timestamp}-${index}`}>
              <title>
                {`${event.scheduleTitle} ${event.type} at ${moment(
                  event.timestamp,
                ).format("ddd HH:mm")} (${Math.round(lengthSeconds)}s)`}
              </title>
              <line
                x1={x}
                y1={CENTER_Y - halfTick}
                x2={x}
                y2={CENTER_Y + halfTick}
                stroke={EVENT_COLORS[event.type]}
                strokeWidth={2.5}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
      <span className="w-6 shrink-0 text-right text-[10px] font-medium text-white/60">
        {spanLabel}
      </span>
    </div>
  );
}
