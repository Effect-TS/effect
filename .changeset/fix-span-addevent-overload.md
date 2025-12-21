---
"@effect/opentelemetry": patch
---

Fix `Span.addEvent` to correctly handle the 2-argument overload with attributes.

Previously, calling `span.addEvent("name", { foo: "bar" })` would throw `TypeError: {} is not iterable` because the implementation incorrectly treated the attributes object as a `TimeInput`. The fix adds proper runtime type discrimination to distinguish between `TimeInput` (number, Date, or HrTime tuple) and `Attributes` (plain object).
