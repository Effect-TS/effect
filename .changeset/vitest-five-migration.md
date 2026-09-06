---
"@effect/vitest": patch
"@effect/doctest": patch
---

Require Vitest 5 (`>=5.0.0 <6.0.0`) for both integrations. Vitest 5 supports Node.js `^22.12.0 || ^24.0.0 || >=26.0.0`. The doctest Vite requirement remains `>=8.1.5 <9.0.0`.

### Breaking changes

- `@effect/vitest` follows Vitest 5's public exports. Replace `test.sequential`, `it.sequential`, `describe.sequential`, and `{ sequential: true }` with `{ concurrent: false }`.
- The top-level `bench` export is removed. Use `test(name, async ({ bench }) => { await bench(name, fn).run() })`, with skip/only/todo on the enclosing test. The old `BenchFactory`, `BenchFunction`, `BenchTask`, `BenchTaskResult`, `Benchmark`, `BenchmarkAPI`, `BenchmarkResult`, and `BenchmarkRunner` exports are removed; migrate to the fixture's `Bench`, `BenchFn`, `BenchRegistration`, and `BenchResult` types or `BenchmarkProvider` for custom engines.
- Assertion types now take the return type first: use `Assertion<void, T>` or `Assertion<Promise<void>, T>`. Declare custom matchers through `vitest.Matchers<R, T>`; `@vitest/expect` no longer shares Vitest's assertion state. Derive the removed `ExpectPollOptions` type from `NonNullable<Parameters<typeof expect.poll>[1]>`.
- Use `vitest/node` for reporter types and `vitest/runtime` for environment and snapshot APIs. JSON reporters write to files by default; configure an explicit `outputFile` when consuming reports.
- Vitest 5 clears mock history before tests by default and fails unawaited asynchronous assertions. Review these and other upstream behavior changes in the [Vitest migration guide](https://vitest.dev/guide/migration/).

Effect test helpers, shared layers, property testing, and doctest snippet syntax retain their existing calling conventions.
