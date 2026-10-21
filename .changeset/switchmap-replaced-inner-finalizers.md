---
"effect": patch
---

Fix `Stream.switchMap` and `Channel.switchMap` delaying finalizers of replaced inner streams until the merged stream ends.
