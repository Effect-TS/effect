---
"effect": patch
---

Fix cluster defect recovery to replay unfinished requests without duplicating requests awaiting their first dispatch. Stop replay and interrupt waiting requests on shutdown, and prevent superseded rebuilds from publishing stale handlers or SQL lock connections.
