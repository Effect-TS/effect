---
"@effect/platform-node": patch
---

Fix `NodeMultipart.stream` hanging when the source closes early or is already destroyed, including any file part still being read, and remove its source listeners once parsing finishes.
