---
"effect": patch
---

Release storage claims for deduplicated cluster requests so concurrent workflow resets can resume on the next poll instead of waiting for the ten-minute claim timeout.

Custom message storage drivers must implement the new required `resetRequests` operation on `MessageStorage.Encoded`. It releases only the specified request claims, preserving replies, processed state, and unrelated requests. This adds a required member to the exported storage interfaces despite the patch release classification on the rc line.
