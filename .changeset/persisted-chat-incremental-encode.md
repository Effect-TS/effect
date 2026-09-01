---
"effect": patch
---

Encode persisted chat history incrementally. `Chat.Persisted` re-encoded every message in a conversation on every save, making persistence quadratic in the number of turns and stalling other fibers while it ran. Messages are now encoded once and reused across saves.

Saving a chat also no longer mutates the messages it stamps with a message identifier: history is rebuilt with replacement messages instead, so a message already handed to a caller does not change underneath them. Persisted output is unchanged.
