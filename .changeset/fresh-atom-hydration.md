---
"effect": patch
---

Prevent atom hydration, including React hydration boundaries and streamed results, from replacing newer AsyncResult successes with older values or resetting resolved results to Initial. Success freshness uses the result timestamp rather than the dehydration time.
