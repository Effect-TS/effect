---
"effect": patch
---

default to `never` for Runtime returning functions

This includes:

- Effect.runtime
- FiberSet.makeRuntime

It prevents `unknown` from creeping into types, as well as `never` being a
useful default type for propogating Fiber Refs and other context.
