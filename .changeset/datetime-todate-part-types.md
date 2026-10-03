---
"effect": patch
---

Read `Intl.DateTimeFormat` parts by type when converting a `DateTime.Zoned` with a named time zone, fixing invalid dates on runtimes that omit the `fractionalSecond` part, such as Hermes on Android.
