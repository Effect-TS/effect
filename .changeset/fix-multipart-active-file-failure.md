---
"effect": patch
---

Propagate upstream body failures to active multipart file consumers instead of hanging after buffered file bytes are consumed. Preserve existing multipart errors and wrap other upstream errors as internal multipart errors.
