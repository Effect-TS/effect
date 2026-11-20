---
"effect": patch
---

Fix a memory leak in cluster `MessageStorage` reply handlers. When a fiber waiting in `registerReplyHandler` was interrupted before a reply arrived, its waiter was removed but its request id stayed in the reply handler map with an empty list. Nothing removed that entry later, because the reply had already been saved or would never be saved under that id.

Workflow replays hit this on every step that had already finished. The replayed activity request is a duplicate, so its waiter is interrupted and answered from storage instead. A long-running runner gained one stale entry per replayed step until the map reached the JavaScript `Map` size limit, and every new request then failed with `RangeError: Map maximum size exceeded`.

The cleanup now deletes the request id once its last waiter leaves, unless a newer registration already replaced the entry.
