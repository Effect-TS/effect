---
"effect": patch
---

Release storage claims for deduplicated cluster requests so concurrent workflow resets can resume on the next poll instead of waiting for the ten-minute claim timeout.
