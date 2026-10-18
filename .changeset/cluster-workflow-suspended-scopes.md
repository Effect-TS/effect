---
"effect": patch
---

Fix suspended cluster workflow scopes not being released when an execution completes. Earlier runs retain their resources through suspension and release them on completion or owner teardown, without running durable workflow finalizers on abandonment.
