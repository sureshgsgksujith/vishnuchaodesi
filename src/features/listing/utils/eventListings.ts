import type { ListingSummary } from "../../dashboard/api/listingsApi";

type AttributeMap = Record<string, unknown>;

export function isEventsTicketsListing(listing: ListingSummary) {
  const category = listing.categoryName?.trim().toLowerCase();
  return category === "events & tickets" || category === "tickets & events";
}

export function isExpiredEventListing(listing: ListingSummary) {
  if (!isEventsTicketsListing(listing)) {
    return false;
  }

  const eventEnd = getEventEndDate(listing);

  return eventEnd ? eventEnd.getTime() < Date.now() : false;
}

export function filterActiveEventListings<T extends ListingSummary>(items: T[]) {
  return items.filter((item) => !isExpiredEventListing(item));
}

export function filterUpcomingDatedEventListings<T extends ListingSummary>(items: T[]) {
  return items.filter((item) => {
    const eventEnd = getEventEndDate(item);
    return eventEnd ? eventEnd.getTime() >= Date.now() : false;
  });
}

export function getEventStartDate(listing: ListingSummary) {
  const attributes = getEventAttributes(listing);
  const startDate = firstValue(attributes, ["event_start_date", "eventStartDate", "eventDate", "startDate"]);
  const startTime = firstValue(attributes, ["start_time", "startTime"]);

  return parseEventDate(startDate, startTime, false);
}

export function getEventEndDate(listing: ListingSummary) {
  const attributes = getEventAttributes(listing);
  const endDate =
    firstValue(attributes, ["event_end_date", "eventEndDate", "endDate", "eventEnd"]) ||
    firstValue(attributes, ["event_start_date", "eventStartDate", "eventDate", "startDate"]);
  const endTime = firstValue(attributes, ["end_time", "endTime"]);

  return parseEventDate(endDate, endTime, true);
}

export function getEventDateLabel(listing: ListingSummary) {
  const eventStart = getEventStartDate(listing);
  const eventEnd = getEventEndDate(listing);

  if (!eventStart) {
    return "";
  }

  const startLabel = formatShortDate(eventStart);
  const endLabel = eventEnd && eventEnd.toDateString() !== eventStart.toDateString()
    ? formatShortDate(eventEnd)
    : "";

  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
}

export function getEventAttributes(listing: ListingSummary): AttributeMap {
  const propertyDetails = (listing.propertyDetails || {}) as AttributeMap;
  const otherInformation = parseRecord(propertyDetails.otherInformation);
  const nestedAttributes = parseRecord(otherInformation.categoryAttributes) || parseRecord(otherInformation.customFields);

  return {
    ...propertyDetails,
    ...(nestedAttributes || {}),
  };
}

function firstValue(source: AttributeMap, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function parseRecord(value: unknown): AttributeMap {
  if (!value) {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as AttributeMap;
  }

  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed && !Array.isArray(parsed) ? parsed as AttributeMap : {};
  } catch {
    return {};
  }
}

function parseEventDate(dateValue: string, timeValue: string, useEndOfDay: boolean) {
  const trimmedDate = dateValue.trim();
  if (!trimmedDate) {
    return null;
  }

  const fallbackTime = useEndOfDay ? "23:59:59" : "00:00:00";
  const normalizedTime = timeValue && /^\d{2}:\d{2}/.test(timeValue)
    ? `${timeValue.slice(0, 5)}:${useEndOfDay ? "59" : "00"}`
    : fallbackTime;
  const dateTime = new Date(`${trimmedDate}T${normalizedTime}`);

  if (!Number.isNaN(dateTime.getTime())) {
    return dateTime;
  }

  const fallback = new Date(trimmedDate);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }

  fallback.setHours(useEndOfDay ? 23 : 0, useEndOfDay ? 59 : 0, useEndOfDay ? 59 : 0, useEndOfDay ? 999 : 0);
  return fallback;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
  }).format(date);
}
