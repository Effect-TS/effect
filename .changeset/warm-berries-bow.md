---
"effect": minor
---

## DateTime Library: DST Disambiguation & Timezone Fix

This release addresses timezone handling issues and adds comprehensive DST (Daylight Saving Time) disambiguation support to the DateTime library.

### Bug Fix: Timezone Offset Calculation

Fixed incorrect UTC conversions when using `DateTime.makeZoned` with `adjustForTimeZone: true`. The issue was caused by improper offset calculation in the `makeZonedFromAdjusted` function, where `calculateNamedOffset` was called with the wrong reference point. The fix implements a precise offset sampling algorithm that tests candidate UTC times and validates them against the target local time.

**Example of the fix:**

- Input: 01:00 Athens time on March 30, 2025
- Before: 2025-03-29T22:00:00.000Z (incorrect)
- After: 2025-03-29T23:00:00.000Z (correct UTC conversion)

### New Feature: DST Disambiguation Support

Added four disambiguation strategies for handling DST edge cases:

- `'compatible'` - Maintains backward compatibility
- `'earlier'` - Choose earlier time during ambiguous periods (default)
- `'later'` - Choose later time during ambiguous periods
- `'reject'` - Throw error for ambiguous times
