---
"@effect/schema": patch
---

- Fix handling of `exact` option overrides in `AST.ParseOptions`
  This commit resolves a bug affecting the `exact` option within `AST.ParseOptions`. Previously, the implementation failed to correctly incorporate overrides for the `exact` setting, resulting in the parser not respecting the specified behavior in extended configurations.
- Improve error messaging in `Pretty.make` for unmatched union schemas
