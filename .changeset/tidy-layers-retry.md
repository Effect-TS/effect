---
"effect": patch
---

Fix `Layer.buildWithMemoMap` retries returning an already-finalized resource by deferring each build until execution.
