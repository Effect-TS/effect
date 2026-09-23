---
"effect": patch
---

Fix a race where interrupting a waiting `PubSub` subscriber could swallow a later message, or interrupting a backpressured publisher could still publish when space became available.
