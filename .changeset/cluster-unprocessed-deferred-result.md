---
"effect": patch
---

Fix a cluster workflow replay ignoring a durable deferred completion that is persisted but not yet processed by the new owner. A `DurableDeferred.raceAll` could pick a different winner on replay and run the wrong branch. Workflow replays now read the stored completion from the unprocessed request when it has no reply yet.
