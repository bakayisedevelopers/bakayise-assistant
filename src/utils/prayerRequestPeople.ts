import { PrayerRequestItem } from '../types';

/** Returns every person attached to a request, including legacy single-person requests. */
export function getPrayerPersonIds(request: PrayerRequestItem): string[] {
  const ids = request.personIds?.filter(Boolean) || [];
  if (request.personId && !ids.includes(request.personId)) ids.unshift(request.personId);
  return [...new Set(ids)];
}

export function isPrayerForPerson(
  request: PrayerRequestItem,
  personId: string
): boolean {
  return getPrayerPersonIds(request).includes(personId);
}

export function isMultiPersonPrayer(request: PrayerRequestItem): boolean {
  return getPrayerPersonIds(request).length > 1;
}
