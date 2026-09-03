---
"effect": patch
---

Fix `Arbitrary.schema` to encode transformed template-literal parts and validate the resulting spelling, including automatic shrink candidates. For example, a template containing `Schema.BooleanFromBit` now generates `"0"` or `"1"` rather than invalid boolean words, while retaining decoded-part checks.

Generation now invokes transformation callbacks. Candidates that fail encoding or decoded validation may be discarded and exhaust the configured discard budget rather than emit invalid values; defects still propagate. This does not guarantee productive generation for arbitrary partial codecs.
