---
"effect": patch
---

Correct `Effect.withErrorReporting` to return an ordinary `Effect` rather than the
input's `Exit` or other subtype. The wrapper preserves success, error, and service
channels, but does not preserve subtype members or correlations between union members.

Code that used the wrapper as an `Exit` must execute it first, for example by yielding
`Effect.exit(wrapped)`, before inspecting the resulting `Exit`. Keep the original input
if its `Exit` or other subtype members are needed without executing the wrapper.
Runtime reporting behavior is unchanged.
