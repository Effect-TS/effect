---
"effect": patch
---

Fix `HttpApiClient` and `AtomHttpApi` result types when `responseMode` is a union, such as `"decoded-only" | "response-only"`. The result type is now the matching union instead of only the decoded success type. When `responseMode` is omitted, the result is still the decoded success type.
