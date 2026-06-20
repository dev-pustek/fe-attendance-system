/**
 * Returns a native Date object that is timezone-shifted such that its
 * local time components (getHours, getDay, getDate, etc) represent
 * the current time in Asia/Jakarta.
 * 
 * This is useful for tricking date-fns into calculating things like
 * startOfWeek or format() using Jakarta time regardless of the user's
 * browser timezone.
 */
export const getJakartaDate = (): Date => {
  // Convert current time to a string representing Jakarta time
  // Example output: "12/20/2026, 11:00:00 PM"
  const tzString = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  
  // Parse back into a Date object. This Date object will have its local
  // time perfectly matching Jakarta's current time.
  return new Date(tzString);
};

/**
 * Safely parses a YYYY-MM-DD string into a Date object exactly at local midnight
 * to prevent timezone-offset shifting when formatting.
 */
export const parseLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
};
