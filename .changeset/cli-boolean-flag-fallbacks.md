---
"effect": patch
---

Run `withFallbackConfig` and `withFallbackPrompt` for boolean flags that are absent from the command line.

Both fallbacks were driven by the `MissingOption` error, which a boolean flag never produces because it parses as `false` when absent. Applying either combinator to a `Flag.boolean` therefore did nothing, including in the documented example:

```ts
const verbose = Flag.boolean("verbose").pipe(
  Flag.withFallbackConfig(Config.boolean("VERBOSE"))
)
```

The fallback now runs whenever the flag is absent, so `VERBOSE=true` is honored. An explicit `--verbose` or `--no-verbose` still wins, and `optional`/`withDefault` still supply the value before any fallback is consulted. When the config is missing the flag falls back to `false` as before; a cancelled prompt fails with `MissingOption`, matching the existing behavior for other flags.
