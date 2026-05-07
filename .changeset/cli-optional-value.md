---
"@effect/cli": minor
---

Add `withOptionalValue` combinator to `@effect/cli` Options, allowing a
CLI option to be specified on the command line without a value. When the
flag is present but not followed by a value the provided `fallback` is
used; when a value is provided it is used as normal; when the flag is
absent entirely the option behaves as before (required unless wrapped with
`optional()` or `withDefault()`).

```ts
// --log-level        → "info"  (fallback)
// --log-level debug  → "debug" (supplied value)
// (flag absent)      → error: Expected to find option '--log-level'
const logLevel = Options.text("log-level").pipe(Options.withOptionalValue("info"))
```
