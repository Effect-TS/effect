---
"effect": minor
---

Introduced `Redacted<T>` module - `Secret` generalization
`Secret extends Redacted<string>`
Added two related schemas `Redacted` and `RedactedFromSelf`
The use of the `Redacted` has been replaced by the use of the `Redacted<string>` in packages with version `0.*.*`
