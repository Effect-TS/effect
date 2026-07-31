# Example Suggestions: `@effect/vitest`

- **Package:** `@effect/vitest`
- **Source:** `packages/vitest/src/index.ts`
- **Uncovered API records:** 16
- **Priorities:** 7 required, 0 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                    | Line | Kind                    | Priority     |
| -------------------------------------- | ---: | ----------------------- | ------------ |
| `@effect/vitest.effect`                |  169 | `unmodeled-export`      | **required** |
| `@effect/vitest.live`                  |  174 | `unmodeled-export`      | **required** |
| `@effect/vitest.flakyTest`             |  233 | `unmodeled-export`      | **required** |
| `@effect/vitest.prop`                  |  241 | `unmodeled-export`      | **required** |
| `@effect/vitest.it`                    |  250 | `unmodeled-export`      | **required** |
| `@effect/vitest.describeWrapped`       |  260 | `unmodeled-export`      | **required** |
| `@effect/vitest.makeMethods`           |  255 | `unmodeled-export`      | **required** |
| `@effect/vitest.addEqualityTesters`    |  164 | `unmodeled-export`      | **optional** |
| `@effect/vitest.API`                   |   21 | `unmodeled-export`      | **optional** |
| `@effect/vitest.Vitest`                |   26 | `namespace`             | **optional** |
| `@effect/vitest.Vitest.TestFunction`   |   30 | `namespace-declaration` | **optional** |
| `@effect/vitest.Vitest.Test`           |   37 | `namespace-declaration` | **optional** |
| `@effect/vitest.Vitest.Arbitraries`    |   48 | `namespace-declaration` | **optional** |
| `@effect/vitest.Vitest.Tester`         |   55 | `namespace-declaration` | **optional** |
| `@effect/vitest.Vitest.MethodsNonLive` |  100 | `namespace-declaration` | **optional** |
| `@effect/vitest.Vitest.Methods`        |  145 | `namespace-declaration` | **optional** |

## Required

### `@effect/vitest.effect`

- **Source:** `packages/vitest/src/index.ts:169`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const effect: Vitest.Tester<Scope.Scope> = internal.effect`
- **Import guidance:** Start from `import { effect } from "@effect/vitest"` and use `effect`.
- **Suggested snippet:** Use a `ts import.meta.vitest suite` snippet that calls `effect` directly to register one Effect-returning test, performs one `assert` inside `Effect.gen`, and lets the helper provide the test scope.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/vitest.live`

- **Source:** `packages/vitest/src/index.ts:174`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const live: Vitest.Tester<Scope.Scope> = internal.live`
- **Import guidance:** Start from `import { live } from "@effect/vitest"` and use `live`.
- **Suggested snippet:** Use a `ts import.meta.vitest suite` snippet that calls `live` directly and demonstrates one live service that differs from the default test service. Keep the assertion deterministic and avoid wall-clock timing.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/vitest.flakyTest`

- **Source:** `packages/vitest/src/index.ts:233`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const flakyTest: <A, E, R>( self: Effect.Effect<A, E, R | Scope.Scope>, timeout?: Duration.Input ) => Effect.Effect<A, never, R> = internal.flakyTest`
- **Import guidance:** Start from `import { flakyTest } from "@effect/vitest"` and use `flakyTest`.
- **Suggested snippet:** Inside one `it.effect` example, use a `Ref` to build a deterministic Effect whose first attempt fails and next attempt succeeds, pass it to `flakyTest`, and assert the successful value. Never make the documentation test genuinely flaky.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/vitest.prop`

- **Source:** `packages/vitest/src/index.ts:241`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const prop: Vitest.Methods["prop"] = internal.prop`
- **Import guidance:** Start from `import { prop } from "@effect/vitest"` and use `prop`.
- **Suggested snippet:** Use a `ts import.meta.vitest suite` snippet that calls `prop` with one small Schema or FastCheck arbitrary and asserts a simple invariant for each generated value.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/vitest.it`

- **Source:** `packages/vitest/src/index.ts:250`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const it: Vitest.Methods = internal.makeMethods(V.it)`
- **Import guidance:** Start from `import { it } from "@effect/vitest"` and use `it`.
- **Suggested snippet:** Use a `ts import.meta.vitest suite` snippet that invokes `it` through one Effect-aware method such as `it.effect`, then assert a deterministic value inside the registered test.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/vitest.describeWrapped`

- **Source:** `packages/vitest/src/index.ts:260`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const describeWrapped: (name: string, f: (it: Vitest.Methods) => void) => V.SuiteCollector = internal.describeWrapped`
- **Import guidance:** Start from `import { describeWrapped } from "@effect/vitest"` and use `describeWrapped`.
- **Suggested snippet:** Use a `ts import.meta.vitest suite` snippet that calls `describeWrapped` to register one named suite and uses one wrapped Effect-aware test method from its callback.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `@effect/vitest.makeMethods`

- **Source:** `packages/vitest/src/index.ts:255`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **required** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const makeMethods: (it: V.TestAPI) => Vitest.Methods = internal.makeMethods`
- **Import guidance:** Start from `import { makeMethods } from "@effect/vitest"` and use `makeMethods`.
- **Suggested snippet:** Wrap Vitest's public test API with `makeMethods`, use one returned Effect-aware registration method, and assert that the registered Effect test runs with the expected scope in a `suite` doctest.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Optional

### `@effect/vitest.addEqualityTesters`

- **Source:** `packages/vitest/src/index.ts:164`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const addEqualityTesters: () => void = internal.addEqualityTesters`
- **Import guidance:** Start from `import { addEqualityTesters } from "@effect/vitest"` and use `addEqualityTesters`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `addEqualityTesters` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.API`

- **Source:** `packages/vitest/src/index.ts:21`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export type API = V.TestAPI<{}>`
- **Import guidance:** Start from `import { API } from "@effect/vitest"` and use `API`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `API`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest`

- **Source:** `packages/vitest/src/index.ts:26`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export namespace Vitest { /** * @since 4.0.0 */ export interface TestFunction<A, E, R, TestArgs extends Array<any>> { (...args: TestArgs): Effect.Effect<A, E, R> } /** * @since 4.0.0 */ export interface Test<R> { <A, E>( name: string, self: TestFunction<A, E, R, [V.TestContext]>, timeout?: number | V.TestOptions ): void } /** * @since 4.0.0 */ export type Arbitraries = | Array<Schema.Schema<any> | FC.Arbitrary<any>> | { [K in string]: Schema.Schema<any> | FC.Arbitrary<any> } /** * @since 4.0.0 *`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest.TestFunction`

- **Source:** `packages/vitest/src/index.ts:30`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface TestFunction<A, E, R, TestArgs extends Array<any>> { (...args: TestArgs): Effect.Effect<A, E, R> }`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest.TestFunction`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest.TestFunction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest.Test`

- **Source:** `packages/vitest/src/index.ts:37`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface Test<R> { <A, E>( name: string, self: TestFunction<A, E, R, [V.TestContext]>, timeout?: number | V.TestOptions ): void }`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest.Test`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest.Test`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest.Arbitraries`

- **Source:** `packages/vitest/src/index.ts:48`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export type Arbitraries = | Array<Schema.Schema<any> | FC.Arbitrary<any>> | { [K in string]: Schema.Schema<any> | FC.Arbitrary<any> }`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest.Arbitraries`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest.Arbitraries`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest.Tester`

- **Source:** `packages/vitest/src/index.ts:55`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface Tester<R> extends Vitest.Test<R> { skip: Vitest.Test<R> skipIf: (condition: unknown) => Vitest.Test<R> runIf: (condition: unknown) => Vitest.Test<R> only: Vitest.Test<R> each: <T>( cases: ReadonlyArray<T> ) => <A, E>(name: string, self: TestFunction<A, E, R, Array<T>>, timeout?: number | V.TestOptions) => void fails: Vitest.Test<R> /** * @since 4.0.0 */ prop: <const Arbs extends Arbitraries, A, E>( name: string, arbitraries: Arbs, self: TestFunction< A, E, R, [ { [K in keyof Arb`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest.Tester`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest.Tester`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest.MethodsNonLive`

- **Source:** `packages/vitest/src/index.ts:100`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface MethodsNonLive<R = never> extends API { readonly effect: Vitest.Tester<R | Scope.Scope> readonly flakyTest: <A, E, R2>( self: Effect.Effect<A, E, R2 | Scope.Scope>, timeout?: Duration.Input ) => Effect.Effect<A, never, R2> readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: { readonly timeout?: Duration.Input }) => { (f: (it: Vitest.MethodsNonLive<R | R2>) => void): void ( name: string, f: (it: Vitest.MethodsNonLive<R | R2>) => void ): void } /** * @since 4.0.0 */ re`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest.MethodsNonLive`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest.MethodsNonLive`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest.Vitest.Methods`

- **Source:** `packages/vitest/src/index.ts:145`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface Methods<R = never> extends MethodsNonLive<R> { readonly live: Vitest.Tester<Scope.Scope | R> readonly layer: <R2, E>(layer: Layer.Layer<R2, E, R>, options?: { readonly memoMap?: Layer.MemoMap readonly timeout?: Duration.Input readonly excludeTestServices?: boolean }) => { (f: (it: Vitest.MethodsNonLive<R | R2>) => void): void ( name: string, f: (it: Vitest.MethodsNonLive<R | R2>) => void ): void } }`
- **Import guidance:** Start from `import { Vitest } from "@effect/vitest"` and use `Vitest.Methods`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Vitest.Methods`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
