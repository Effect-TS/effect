---
"effect": patch
---

Add `effect/SemVer` for strict Semantic Versioning 2.0.0 values with parsing, `fromInput` conversion, canonical formatting, spec precedence ordering, structural equality and hashing, npm-style version bumps (per level or by `ReleaseType` via `bump`) and `difference` classification, and add `effect/SemVerRange` for npm-style ranges (`parse`, `fromInput`, constructors from versions such as `greaterThanOrEqualTo`, `caret`, and `between`, `format`, `matches`, `maxSatisfying`, `minSatisfying`). Add `Schema.SemVer`, `Schema.SemVerFromString`, `Schema.SemVerRange`, and `Schema.SemVerRangeFromString` for string codecs.
