---
"@effect/platform-browser": patch
---

Close open `IndexedDbDatabase` connections on `versionchange` so schema upgrades are not blocked by existing tabs, and surface synchronous transaction errors on closed connections as typed `IndexedDbQueryError` failures instead of defects.
