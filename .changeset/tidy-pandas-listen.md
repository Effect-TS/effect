---
"effect": patch
---

Skip cleared poller slots when a PubSub publish completes subscribers, instead of dying with `TypeError: Cannot read properties of undefined (reading 'effect')` after a waiting subscriber was interrupted
