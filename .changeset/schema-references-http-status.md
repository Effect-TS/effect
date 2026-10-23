---
"effect": patch
---

Preserve shared references in `Schema.toCodecJson` and `Schema.toCodecStringTree`, and retain `httpApiStatus` annotations when adding checks.

If you relied on checks clearing HTTP statuses, add `.annotate({ httpApiStatus: undefined })` explicitly.
