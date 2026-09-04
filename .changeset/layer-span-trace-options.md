---
"effect": patch
---

Honor `captureStackTrace` in both forms of `Layer.withSpan` when attaching diagnostic stack frames to layer construction. Disabling capture or supplying a custom lazy stack trace now also applies to layer acquisition failures.
