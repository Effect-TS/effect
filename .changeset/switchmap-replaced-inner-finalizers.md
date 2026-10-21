---
"effect": patch
---

Fix `Stream.switchMap` and `Channel.switchMap` not finalizing inner streams that were replaced before they started.
