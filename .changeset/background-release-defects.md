---
"effect": patch
---

Report unobserved release failures at `UnhandledLogLevel` for RcMap and RcRef idle expiry, abandoned interrupted RcMap lookups, and ScopedCache expiry discovered by keys, values, or entries scans. Preserve failure propagation when cleanup is observed by a caller.
