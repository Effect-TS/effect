---
"effect": minor
---

Add the opt-in `reportInput` parse option for retaining rejected inputs on value-bearing schema issues and including them in default formatted messages. `Schema.makeEffect` now returns `SchemaIssue.Issue` failures directly instead of wrapping them in `SchemaError`.
