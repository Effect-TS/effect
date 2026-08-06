---
"effect": minor
---

Add the opt-in `reportInput` parse option for retaining rejected inputs in enumerable fields on value-bearing schema issues and including them in default formatted messages. Value-bearing issue constructors accept the rejected input and parse options directly. `Schema.makeEffect` now returns `SchemaIssue.Issue` failures instead of wrapping them in `SchemaError`, and fallible `Optic` operations now return structured `SchemaIssue.Issue` failures instead of formatted strings.
