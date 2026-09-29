---
"effect": patch
---

Fix `Reloadable.auto` hanging when its scope closes. The reload fiber was forked while uninterruptible, so shutting down an app or failing a sibling layer waited forever and hid the failure.
