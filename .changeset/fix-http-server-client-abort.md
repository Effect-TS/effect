---
"@effect/platform": patch
---

Fix HTTP server returning 503 instead of 499 when client disconnects during nested fiber execution

When a client disconnects and the request handler has child fibers (e.g., outbound HTTP calls), the server would incorrectly return 503 (Service Unavailable) instead of 499 (Client Closed Request). This happened because `causeResponse` only checked if the first interrupt in the cause tree was from `clientAbortFiberId`, but child fibers are interrupted by their parent's fiber ID. The fix now checks if `clientAbortFiberId` exists anywhere in the cause's interruptors.
