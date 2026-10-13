---
"effect": patch
---

Add `dispatchEmptyNamedEvents` to `Sse` decode options. It also dispatches an event that sets an `event:` name but has no `data:` line, which protocols such as graphql-sse use for `complete`.
