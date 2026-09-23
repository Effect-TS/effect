---
"@effect/vitest": patch
---

Stop an anonymous `layer` from breaking Vitest fixture tests in the same suite. Its `beforeEach` hook took the test context as a plain parameter, which Vitest rejects with `FixtureParseError` once the suite defines fixtures. The hook now destructures the fields it uses.
