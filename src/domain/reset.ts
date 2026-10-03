import type { ClaimState } from "./types";

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface WindowRange {
  id: string;
  start: Date;
  end: Date;
}

export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  let year = Number(bag.year);
  let month = Number(bag.month);
  let day = Number(bag.day);
  let hour = Number(bag.hour);
  if (hour === 24) {
    hour = 0;
    const shifted = shiftDate(year, month, day, 1);
    year = shifted.year;
    month = shifted.month;
    day = shifted.day;
  }
  return {
    year,
    month,
    day,
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: WEEKDAY[bag.weekday] ?? 0,
  };
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i += 1) {
    const parts = zonedParts(new Date(utc), timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = target - asUtc;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

export function shiftDate(year: number, month: number, day: number, delta: number) {
  const next = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function dailyWindow(now: Date, hour: number, minute: number, timeZone: string): WindowRange {
  const parts = zonedParts(now, timeZone);
  const todayStart = zonedTimeToUtc(parts.year, parts.month, parts.day, hour, minute, 0, timeZone);
  const local = now < todayStart ? shiftDate(parts.year, parts.month, parts.day, -1) : parts;
  const start = zonedTimeToUtc(local.year, local.month, local.day, hour, minute, 0, timeZone);
  const next = shiftDate(local.year, local.month, local.day, 1);
  const end = zonedTimeToUtc(next.year, next.month, next.day, hour, minute, 0, timeZone);
  return {
    id: `daily:${local.year}-${pad(local.month)}-${pad(local.day)}@${pad(hour)}:${pad(minute)}`,
    start,
    end,
  };
}

export function weeklyWindow(
  now: Date,
  weekday: number,
  hour: number,
  minute: number,
  timeZone: string,
): WindowRange {
  const parts = zonedParts(now, timeZone);
  let cursor = { year: parts.year, month: parts.month, day: parts.day };
  const todayBoundary = zonedTimeToUtc(cursor.year, cursor.month, cursor.day, hour, minute, 0, timeZone);
  if (now < todayBoundary) cursor = shiftDate(cursor.year, cursor.month, cursor.day, -1);

  for (let i = 0; i < 8; i += 1) {
    const noon = zonedTimeToUtc(cursor.year, cursor.month, cursor.day, 12, 0, 0, timeZone);
    const noonParts = zonedParts(noon, timeZone);
    if (noonParts.weekday === weekday) break;
    cursor = shiftDate(cursor.year, cursor.month, cursor.day, -1);
  }

  const start = zonedTimeToUtc(cursor.year, cursor.month, cursor.day, hour, minute, 0, timeZone);
  const endDate = shiftDate(cursor.year, cursor.month, cursor.day, 7);
  const end = zonedTimeToUtc(endDate.year, endDate.month, endDate.day, hour, minute, 0, timeZone);
  return {
    id: `weekly:${cursor.year}-${pad(cursor.month)}-${pad(cursor.day)}@${pad(hour)}:${pad(minute)}`,
    start,
    end,
  };
}

export function eventWindow(now: Date, startIso: string, endIso: string, eventId: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const status: "upcoming" | "active" | "expired" = now < start ? "upcoming" : now < end ? "active" : "expired";
  return {
    id: `event:${eventId}:${startIso}:${endIso}`,
    start,
    end,
    status,
  };
}

export function resolveClaimState(input: {
  stored: { state: ClaimState; windowId: string } | null;
  windowId: string;
  windowStatus: "upcoming" | "active" | "expired";
  defaultState: ClaimState;
}): ClaimState {
  if (input.windowStatus === "upcoming") return "UNKNOWN";
  if (!input.stored || input.stored.windowId !== input.windowId) {
    return input.windowStatus === "expired" ? "UNKNOWN" : input.defaultState;
  }
  if (input.windowStatus === "expired" && input.stored.state !== "CLAIMED") return "MISSED";
  return input.stored.state;
}

export function wasMissed(
  claims: { opportunityId: string; state: string; windowId: string }[],
  opportunityId: string,
  windowId: string,
): boolean {
  const hit = claims.find((claim) => claim.opportunityId === opportunityId && claim.windowId === windowId);
  if (!hit) return false;
  return hit.state === "AVAILABLE" || hit.state === "MISSED";
}
