---
"@effect/vitest": minor
---

Modernize Vitest integration with AbortSignal support

- Bump Vitest dependency from ^3.0.0 to ^3.2.0 to support latest features
- Add support for Vitest 3.2's AbortSignal API for proper test cancellation
- Effect-based tests now respect AbortSignal for clean cancellation when tests timeout, fail with --bail flag, or are interrupted via Ctrl+C
- Integrate AbortSignal at the Effect runtime level using `Effect.runPromise(effect, { signal })` for native cancellation support
- Add comprehensive test cases demonstrating AbortSignal integration and type safety