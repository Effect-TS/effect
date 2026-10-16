---
"effect": patch
---

Stop failed `Reactivity.query` and `SqlClient.reactiveMailbox` queries from rerunning on later invalidations, and discard pending reruns when a query fails.
