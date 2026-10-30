---
"effect": patch
---

Fix local callers of persisted entity requests hanging when a reply save commits but reports a failure, for example when the connection drops before the COMMIT acknowledgement arrives. The runner now checks storage for the committed reply and lets the caller read it, without replaying the request.
