import { execFile } from "child_process";
import log from "electron-log";
import { CalendarInfo, CalendarMeeting } from "../../types/calendar";

export interface ActiveCalendarMeeting {
  start: number;
  end: number;
}

interface CalendarEventResult {
  start: number;
  end: number;
}

interface CalendarCheckResult {
  status: number;
  active: CalendarEventResult[];
  meetings: CalendarEventResult[];
  calendars?: CalendarInfo[];
}

const POLL_INTERVAL_MS = 15 * 1000;
const SCRIPT_TIMEOUT_MS = 25 * 1000;
const REQUEST_TIMEOUT_MS = 15 * 1000;
const STALE_RESULT_MS = 5 * 60 * 1000;
const CALENDAR_WINDOW_MS = 24 * 60 * 60 * 1000;

let enabled = false;
let excludedCalendarIds: string[] = [];
let configVersion = 0;
let pollTimer: NodeJS.Timeout | null = null;
let activeMeeting: ActiveCalendarMeeting | null = null;
let recentMeetings: CalendarMeeting[] = [];
let permissionRequested = false;
let refreshing = false;
let lastSuccessfulCheck = 0;

interface CalendarScriptOptions {
  shouldRequest: boolean;
  excludedCalendarIds?: string[];
  listOnly?: boolean;
}

function buildScript({
  shouldRequest,
  excludedCalendarIds = [],
  listOnly = false,
}: CalendarScriptOptions): string {
  const excludedIds = JSON.stringify(excludedCalendarIds);
  return `
ObjC.import('EventKit');
ObjC.import('Foundation');

function authorizationStatus() {
  return Number($.EKEventStore.authorizationStatusForEntityType($.EKEntityTypeEvent));
}

function main() {
  const store = $.EKEventStore.alloc.init;
  let status = authorizationStatus();
  const shouldRequest = ${shouldRequest ? "true" : "false"};
  const excludedCalendarIds = ${excludedIds};

  if (shouldRequest && status === 0) {
    let finished = false;
    try {
      try {
        store.requestFullAccessToEventsWithCompletion(function () {
          finished = true;
        });
      } catch (error) {
        store.requestAccessToEntityTypeCompletion($.EKEntityTypeEvent, function () {
          finished = true;
        });
      }

      const deadline = Date.now() + ${REQUEST_TIMEOUT_MS};
      while (!finished && Date.now() < deadline) {
        $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.1));
        status = authorizationStatus();
        if (status !== 0) break;
      }
    } catch (error) {}
    status = authorizationStatus();
  }

  if (status !== 3 && status !== 4) {
    return JSON.stringify({ status: status, active: [], meetings: [], calendars: [] });
  }

  if (${listOnly ? "true" : "false"}) {
    const calendars = [];
    const eventCalendars = store.calendarsForEntityType($.EKEntityTypeEvent);
    for (let index = 0; index < eventCalendars.count; index++) {
      const calendar = eventCalendars.objectAtIndex(index);
      let source = "";
      try {
        source = String(calendar.source.title.js);
      } catch (error) {}
      calendars.push({
        id: String(calendar.calendarIdentifier.js),
        title: String(calendar.title.js),
        source: source,
      });
    }
    return JSON.stringify({ status: status, active: [], meetings: [], calendars: calendars });
  }

  const now = $.NSDate.date;
  const nowSeconds = Number(now.timeIntervalSince1970);
  const windowStartSeconds = nowSeconds - ${CALENDAR_WINDOW_MS / 1000};
  const predicate = store.predicateForEventsWithStartDateEndDateCalendars(
    now.dateByAddingTimeInterval(-${CALENDAR_WINDOW_MS / 1000}),
    now.dateByAddingTimeInterval(60),
    $()
  );
  const events = store.eventsMatchingPredicate(predicate);
  const meetings = [];
  const active = [];

  for (let index = 0; index < events.count; index++) {
    const event = events.objectAtIndex(index);
    let calendarId = "";
    try {
      calendarId = String(event.calendar.calendarIdentifier.js);
    } catch (error) {}
    if (calendarId && excludedCalendarIds.indexOf(calendarId) !== -1) continue;
    if (Boolean(event.isAllDay)) continue;
    if (Number(event.status) === 3) continue;
    if (Number(event.availability) === 1) continue;

    const start = Number(event.startDate.timeIntervalSince1970);
    const end = Number(event.endDate.timeIntervalSince1970);
    if (end <= windowStartSeconds) continue;

    let declined = false;
    try {
      const attendees = event.attendees;
      if (attendees) {
        for (let attendeeIndex = 0; attendeeIndex < attendees.count; attendeeIndex++) {
          const attendee = attendees.objectAtIndex(attendeeIndex);
          if (attendee.isCurrentUser && Number(attendee.participantStatus) === 3) {
            declined = true;
          }
        }
      }
    } catch (error) {}

    if (declined) continue;

    const meeting = {
      start: Math.max(start, windowStartSeconds) * 1000,
      end: end * 1000,
    };
    meetings.push(meeting);

    if (start <= nowSeconds && end > nowSeconds) {
      active.push(meeting);
    }
  }

  return JSON.stringify({ status: status, active: active, meetings: meetings });
}

main();
`;
}

function updateActiveMeeting(result: CalendarCheckResult): void {
  if (result.status !== 3 && result.status !== 4) {
    activeMeeting = null;
    recentMeetings = [];
    return;
  }

  recentMeetings = Array.isArray(result.meetings) ? result.meetings : [];

  const active = Array.isArray(result.active) ? result.active : [];
  if (active.length === 0) {
    activeMeeting = null;
    return;
  }

  const latest = active.reduce((a, b) => (a.end >= b.end ? a : b));
  const next: ActiveCalendarMeeting = {
    start: latest.start,
    end: latest.end,
  };

  if (!activeMeeting || activeMeeting.end !== next.end) {
    log.info(
      `Calendar meeting active [ends=${new Date(next.end).toISOString()}]`,
    );
  }

  activeMeeting = next;
}

function refresh(): void {
  if (!enabled || refreshing) {
    return;
  }

  refreshing = true;
  const version = configVersion;
  const shouldRequest = !permissionRequested;
  permissionRequested = true;

  execFile(
    "osascript",
    [
      "-l",
      "JavaScript",
      "-e",
      buildScript({ shouldRequest, excludedCalendarIds }),
    ],
    { timeout: SCRIPT_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
    (error, stdout, stderr) => {
      refreshing = false;

      if (!enabled) {
        return;
      }

      if (version !== configVersion) {
        refresh();
        return;
      }

      if (error) {
        log.warn(`Calendar check failed: ${error.message}`);
        if (Date.now() - lastSuccessfulCheck > STALE_RESULT_MS) {
          activeMeeting = null;
          recentMeetings = [];
        }
        return;
      }

      try {
        const result = JSON.parse(stdout.trim()) as CalendarCheckResult;
        lastSuccessfulCheck = Date.now();
        updateActiveMeeting(result);
      } catch (parseError) {
        log.warn("Calendar check returned invalid output", parseError, stderr);
        if (Date.now() - lastSuccessfulCheck > STALE_RESULT_MS) {
          activeMeeting = null;
          recentMeetings = [];
        }
      }
    },
  );
}

export function getCalendarList(
  requestAccess: boolean,
): Promise<CalendarInfo[]> {
  if (process.platform !== "darwin") {
    return Promise.resolve([]);
  }

  if (requestAccess) {
    permissionRequested = true;
  }

  return new Promise((resolve) => {
    execFile(
      "osascript",
      [
        "-l",
        "JavaScript",
        "-e",
        buildScript({ shouldRequest: requestAccess, listOnly: true }),
      ],
      { timeout: SCRIPT_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          log.warn(`Calendar list check failed: ${error.message}`);
          resolve([]);
          return;
        }

        try {
          const result = JSON.parse(stdout.trim()) as CalendarCheckResult;
          resolve(Array.isArray(result.calendars) ? result.calendars : []);
        } catch (parseError) {
          log.warn(
            "Calendar list check returned invalid output",
            parseError,
            stderr,
          );
          resolve([]);
        }
      },
    );
  });
}

export function setCalendarExcludedIds(ids: string[]): void {
  const next = Array.isArray(ids) ? ids : [];
  const unchanged =
    next.length === excludedCalendarIds.length &&
    next.every((id, index) => id === excludedCalendarIds[index]);
  if (unchanged) {
    return;
  }

  excludedCalendarIds = next;
  configVersion += 1;
  activeMeeting = null;
  recentMeetings = [];

  if (enabled) {
    refresh();
  }
}

export function setCalendarPauseEnabled(value: boolean): void {
  if (process.platform !== "darwin" || value === enabled) {
    return;
  }

  enabled = value;
  configVersion += 1;

  if (enabled) {
    permissionRequested = false;
    activeMeeting = null;
    recentMeetings = [];
    refresh();
    pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
  } else {
    clearInterval(pollTimer ?? undefined);
    pollTimer = null;
    activeMeeting = null;
    recentMeetings = [];
  }
}

export function getActiveCalendarMeeting(): ActiveCalendarMeeting | null {
  return activeMeeting;
}

export function getRecentCalendarMeetings(): CalendarMeeting[] {
  return recentMeetings;
}

export function isCalendarMeetingActive(): boolean {
  return activeMeeting !== null;
}
