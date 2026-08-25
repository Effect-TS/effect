---
"effect": patch
---

Prevent tool handlers from running when language model generation returns an incomplete or invalid response. Incremental streaming fallback now occurs only before the provider emits its first response part.
