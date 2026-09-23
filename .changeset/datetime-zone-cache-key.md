---
"effect": patch
---

`DateTime.zoneMakeNamedUnsafe` (and so `zoneMakeNamed`, `zoneFromString`, `setZoneNamed` and `withCurrentZoneNamed`) cached a time zone under the id `Intl` resolved to while looking it up under the id the caller passed. For an aliased id such as `"Japan"` or `"US/Pacific"` the lookup missed every time and rebuilt a full `Intl.DateTimeFormat` on every call. The zone still reports the id `Intl` resolved to.
