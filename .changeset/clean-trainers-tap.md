---
"effect": minor
---

add DateTime module

The `DateTime` module provides functionality for working with time, including
support for time zones and daylight saving time.

It has two main data types: `DateTime.Utc` and `DateTime.Zoned`.

A `DateTime.Utc` represents a time in Coordinated Universal Time (UTC), and
a `DateTime.Zoned` contains both a UTC timestamp and a time zone.

There is also a `CurrentTimeZone` service, for setting a time zone contextually.

```ts
import { DateTime, Effect } from "effect";

Effect.gen(function* () {
  // Get the current time in the current time zone
  const now = yield* DateTime.nowInCurrentZone;

  // Math functions are included
  const tomorrow = DateTime.add(now, 1, "day");

  // Convert to a different time zone
  // The UTC portion of the `DateTime` is preserved and only the time zone is
  // changed
  const sydneyTime = tomorrow.pipe(
    DateTime.unsafeSetZoneNamed("Australia/Sydney"),
  );
}).pipe(DateTime.withCurrentZoneNamed("America/New_York"));
```
