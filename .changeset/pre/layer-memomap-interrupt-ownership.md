---
"effect": patch
---

Fix interrupted `Layer` memoization so waiting and later requesters receive the interrupted build's exit instead of hanging, and shared layers are released when scopes close. Correct `MemoMap.get` observer accounting for effects run twice or never run.
