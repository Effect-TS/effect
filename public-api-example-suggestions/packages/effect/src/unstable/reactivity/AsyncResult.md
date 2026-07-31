# Example Suggestions: `effect/unstable/reactivity/AsyncResult`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts`
- **Uncovered API records:** 48
- **Priorities:** 0 required, 27 recommended, 19 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind                    | Priority        |
| ------------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/unstable/reactivity/AsyncResult.error`                     |  460 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.builder`                   |  717 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.isAsyncResult`             |   62 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.isWaiting`                 |  148 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.fromExit`                  |  166 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.fromExitWithPrevious`      |  175 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.waitingFrom`               |  187 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.isInitial`                 |  200 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.initial`                   |  217 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.success`                   |  250 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.failure`                   |  297 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.failureWithPrevious`       |  318 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.fail`                      |  341 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.failWithPrevious`          |  352 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.waiting`                   |  366 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.touch`                     |  386 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.replacePrevious`           |  400 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.value`                     |  416 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.cause`                     |  451 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.toExit`                    |  469 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.map`                       |  491 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.flatMap`                   |  524 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.match`                     |  558 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.matchWithError`            |  590 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.matchWithWaiting`          |  630 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.all`                       |  673 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.Schema (value)`            |  946 | `root-declaration`      | **recommended** |
| `effect/unstable/reactivity/AsyncResult.Schema (type)`             |  926 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.isNotInitial`              |  208 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.isSuccess`                 |  242 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.isFailure`                 |  280 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.isInterrupted`             |  288 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.getOrElse`                 |  431 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.getOrThrow`                |  442 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.AsyncResult (type) (type)` |   54 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.AsyncResult (type) (type)` |   69 | `namespace`             | **optional**    |
| `effect/unstable/reactivity/AsyncResult.AsyncResult.Proto`         |   76 | `namespace-declaration` | **optional**    |
| `effect/unstable/reactivity/AsyncResult.AsyncResult.Success`       |   90 | `namespace-declaration` | **optional**    |
| `effect/unstable/reactivity/AsyncResult.AsyncResult.Failure`       |   98 | `namespace-declaration` | **optional**    |
| `effect/unstable/reactivity/AsyncResult.With`                      |  107 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.Initial`                   |  156 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.Success`                   |  230 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.Failure`                   |  268 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.Defect`                    |  731 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.Interrupt`                 |  741 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.Builder`                   |  751 | `root-declaration`      | **optional**    |
| `effect/unstable/reactivity/AsyncResult.TypeId (type)`             |   38 | `root-declaration`      | **discouraged** |
| `effect/unstable/reactivity/AsyncResult.TypeId (value)`            |   46 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/reactivity/AsyncResult.error`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:460`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Returns the first typed error from a failure cause, or `None` for successes, initial results, defects, and interrupt-only causes.
- **Signature hint:** `declare function error<A, E>(self: AsyncResult<A, E>): Option.Option<E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.error`.
- **Suggested snippet:** Call `AsyncResult.error` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.builder`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:717`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a typed builder for rendering an `AsyncResult` by handling waiting, initial, success, error, defect, interrupt, and failure cases.
- **Signature hint:** `declare function builder<A extends AsyncResult<any, any>>(self: A): Builder<never, A extends Success<infer _A, infer _E> ? _A : never, A extends Failure<infer _A, infer _E> ? _E : never, A extends Initial<infer _A, infer _E> ? true : never, A extends Failure<infer _A, infer _E> ? Defect | Interrupt : never>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.builder`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a typed builder for rendering an `AsyncResult` by handling waiting, initial, success, error, defect, interrupt, and failure cases. Call `AsyncResult.builder` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.isAsyncResult`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:62`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `AsyncResult`.
- **Signature hint:** `declare function isAsyncResult(u: unknown): u is AsyncResult<unknown, unknown>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isAsyncResult`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AsyncResult.isAsyncResult` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.isWaiting`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:148`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **recommended**
- **Current description:** Returns whether an `AsyncResult` is currently waiting for an asynchronous computation or refresh to finish.
- **Signature hint:** `declare function isWaiting<A, E>(result: AsyncResult<A, E>): boolean`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isWaiting`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `AsyncResult.isWaiting`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.fromExit`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:166`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Converts an `Exit` into a `Success` when it succeeds or a `Failure` carrying the exit cause when it fails.
- **Signature hint:** `declare function fromExit<A, E>(exit: Exit.Exit<A, E>): Success<A, E> | Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.fromExit`.
- **Suggested snippet:** Convert one representative external input with `AsyncResult.fromExit` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.fromExitWithPrevious`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:175`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Converts an `Exit` to a result, preserving the latest previous success when the exit is a failure.
- **Signature hint:** `declare function fromExitWithPrevious<A, E>(exit: Exit.Exit<A, E>, previous: Option.Option<AsyncResult<A, E>>): Success<A, E> | Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.fromExitWithPrevious`.
- **Suggested snippet:** Convert one representative external input with `AsyncResult.fromExitWithPrevious` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.waitingFrom`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:187`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a waiting result from an optional previous result, using `Initial(true)` when no previous result exists.
- **Signature hint:** `declare function waitingFrom<A, E>(previous: Option.Option<AsyncResult<A, E>>): AsyncResult<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.waitingFrom`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a waiting result from an optional previous result, using `Initial(true)` when no previous result exists. Call `AsyncResult.waitingFrom` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.isInitial`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:200`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **recommended**
- **Current description:** Returns `true` when an `AsyncResult` is in the `Initial` state.
- **Signature hint:** `declare function isInitial<A, E>(result: AsyncResult<A, E>): result is Initial<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isInitial`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AsyncResult.isInitial` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.initial`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:217`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `Initial` result, optionally marking it as waiting.
- **Signature hint:** `declare function initial<A = never, E = never>(waiting?: boolean): Initial<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.initial`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `Initial` result, optionally marking it as waiting. Call `AsyncResult.initial` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.success`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:250`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Success` result with a value and optional `waiting` flag or timestamp override.
- **Signature hint:** `declare function success<A, E = never>(value: A, options?: { readonly waiting?: boolean | undefined; readonly timestamp?: number | undefined; }): Success<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.success`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `Success` result with a value and optional `waiting` flag or timestamp override. Call `AsyncResult.success` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.failure`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:297`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Failure` result from a `Cause`, optionally preserving a previous success and marking the result as waiting.
- **Signature hint:** `declare function failure<A, E = never>(cause: Cause.Cause<E>, options?: { readonly previousSuccess?: Option.Option<Success<A, E>> | undefined; readonly waiting?: boolean | undefined; }): Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.failure`.
- **Suggested snippet:** Construct one representative value with `AsyncResult.failure`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.failureWithPrevious`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:318`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Failure` result from a `Cause`, carrying forward the latest success stored in a previous result.
- **Signature hint:** `declare function failureWithPrevious<A, E>(cause: Cause.Cause<E>, options: { readonly previous: Option.Option<AsyncResult<A, E>>; readonly waiting?: boolean | undefined; }): Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.failureWithPrevious`.
- **Suggested snippet:** Construct one representative value with `AsyncResult.failureWithPrevious`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.fail`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:341`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Failure` result from a typed error, wrapping it in `Cause.fail`.
- **Signature hint:** `declare function fail<E, A = never>(error: E, options?: { readonly previousSuccess?: Option.Option<Success<A, E>> | undefined; readonly waiting?: boolean | undefined; }): Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.fail`.
- **Suggested snippet:** Construct one representative value with `AsyncResult.fail`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.failWithPrevious`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:352`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Failure` result from a typed error while carrying forward the latest success stored in a previous result.
- **Signature hint:** `declare function failWithPrevious<A, E>(error: E, options: { readonly previous: Option.Option<AsyncResult<A, E>>; readonly waiting?: boolean | undefined; }): Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.failWithPrevious`.
- **Suggested snippet:** Construct one representative value with `AsyncResult.failWithPrevious`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.waiting`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:366`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Marks an `AsyncResult` as waiting, optionally touching the timestamp when the result is a `Success`.
- **Signature hint:** `declare function waiting<R extends AsyncResult<any, any>>(self: R, options?: { readonly touch?: boolean | undefined; }): R`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.waiting`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Marks an `AsyncResult` as waiting, optionally touching the timestamp when the result is a `Success`. Call `AsyncResult.waiting` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.touch`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:386`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Refreshes the timestamp of a `Success` result while preserving its value and waiting flag; non-success results are returned unchanged.
- **Signature hint:** `declare function touch<A extends AsyncResult<any, any>>(result: A): A`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.touch`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `AsyncResult.touch`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.replacePrevious`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:400`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Replaces a `Failure` value's stored previous success with the latest success found in another result.
- **Signature hint:** `declare function replacePrevious<R extends AsyncResult<any, any>, XE, A>(self: R, previous: Option.Option<AsyncResult<A, XE>>): With<R, A, AsyncResult.Failure<R>>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.replacePrevious`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Replaces a `Failure` value's stored previous success with the latest success found in another result. Call `AsyncResult.replacePrevious` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.value`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:416`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Returns the current success value, or the previous success value stored in a failure, as an `Option`.
- **Signature hint:** `declare function value<A, E>(self: AsyncResult<A, E>): Option.Option<A>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.value`.
- **Suggested snippet:** Call `AsyncResult.value` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.cause`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:451`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Returns the failure cause when the result is a `Failure`, otherwise `None`.
- **Signature hint:** `declare function cause<A, E>(self: AsyncResult<A, E>): Option.Option<Cause.Cause<E>>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.cause`.
- **Suggested snippet:** Call `AsyncResult.cause` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.toExit`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:469`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Converts a result to an `Exit`, succeeding with a success value, failing with a failure cause, or failing with `NoSuchElementError` for `Initial`.
- **Signature hint:** `declare function toExit<A, E>(self: AsyncResult<A, E>): Exit.Exit<A, E | Cause.NoSuchElementError>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.toExit`.
- **Suggested snippet:** Call `AsyncResult.toExit` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.map`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:491`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Maps the success value of an `AsyncResult`, also mapping any previous success stored in a failure while leaving initial results unchanged.
- **Signature hint:** `declare function map<A, B>(f: (a: A) => B): <E>(self: AsyncResult<A, E>) => AsyncResult<B, E> declare function map<E, A, B>(self: AsyncResult<A, E>, f: (a: A) => B): AsyncResult<B, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.map`.
- **Suggested snippet:** Apply `AsyncResult.map` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.flatMap`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:524`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Maps the success value of an `AsyncResult` and flattens the result.
- **Signature hint:** `declare function flatMap<A, E, B, E2>(f: (a: A, prev: Success<A, E>) => AsyncResult<A, E2>): (self: AsyncResult<A, E>) => AsyncResult<B, E | E2> declare function flatMap<E, A, B, E2>(self: AsyncResult<A, E>, f: (a: A, prev: Success<A, E>) => AsyncResult<B, E2>): AsyncResult<B, E | E2>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.flatMap`.
- **Suggested snippet:** Apply `AsyncResult.flatMap` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.match`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:558`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Pattern matches an `AsyncResult` by calling the handler for `Initial`, `Failure`, or `Success`.
- **Signature hint:** `declare function match<A, E, X, Y, Z>(options: { readonly onInitial: (_: Initial<A, E>) => X; readonly onFailure: (_: Failure<A, E>) => Y; readonly onSuccess: (_: Success<A, E>) => Z; }): (self: AsyncResult<A, E>) => X | Y | Z declare function match<A, E, X, Y, Z>(self: AsyncResult<A, E>, options: { readonly onInitial: (_: Initial<A, E>) => X; readonly onFailure: (_: Failure<A, E>) => Y; readonly onSuccess: (_: Success<A, E>) => Z; }): X | Y | Z`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.match`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `AsyncResult.match`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.matchWithError`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:590`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Pattern matches a result, handling successes and initials directly while splitting failures into typed errors or squashed non-error causes passed to `onDefect`.
- **Signature hint:** `declare function matchWithError<A, E, W, X, Y, Z>(options: { readonly onInitial: (_: Initial<A, E>) => W; readonly onError: (error: E, _: Failure<A, E>) => X; readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y; readonly onSuccess: (_: Success<A, E>) => Z; }): (self: AsyncResult<A, E>) => W | X | Y | Z declare function matchWithError<A, E, W, X, Y, Z>(self: AsyncResult<A, E>, options: { readonly onInitial: (_: Initial<A, E>) => W; readonly onError: (error: E, _: Failure<A, E>) => X; readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y; readonly onSuccess: (_: Success<A, E>) => Z; }): W | X | Y | Z`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.matchWithError`.
- **Suggested snippet:** Create or capture `AsyncResult.matchWithError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.matchWithWaiting`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:630`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Pattern matches a result by calling `onWaiting` for waiting or initial states, otherwise handling successes and splitting failures into typed errors or squashed non-error causes.
- **Signature hint:** `declare function matchWithWaiting<A, E, W, X, Y, Z>(options: { readonly onWaiting: (_: AsyncResult<A, E>) => W; readonly onError: (error: E, _: Failure<A, E>) => X; readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y; readonly onSuccess: (_: Success<A, E>) => Z; }): (self: AsyncResult<A, E>) => W | X | Y | Z declare function matchWithWaiting<A, E, W, X, Y, Z>(self: AsyncResult<A, E>, options: { readonly onWaiting: (_: AsyncResult<A, E>) => W; readonly onError: (error: E, _: Failure<A, E>) => X; readonly onDefect: (defect: unknown, _: Failure<A, E>) => Y; readonly onSuccess: (_: Success<A, E>) => Z; }): W | X | Y | Z`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.matchWithWaiting`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `AsyncResult.matchWithWaiting`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.all`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:673`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Combines an iterable or record of `AsyncResult` and plain values into one `AsyncResult`, returning the first non-success result or a success of the collected values marked waiting when any input success is waiting.
- **Signature hint:** `declare function all<const Arg extends Iterable<any> | Record<string, any>>(results: Arg): AsyncResult<[Arg] extends [ReadonlyArray<any>] ? { -readonly [K in keyof Arg]: [Arg[K]] extends [AsyncResult<infer _A, infer _E>] ? _A : Arg[K]; } : [Arg] extends [Iterable<infer _A>] ? _A extends AsyncResult<infer _AA, infer _E> ? _AA : _A : [Arg] extends [Record<string, any>] ? { -readonly [K in keyof Arg]: [Arg[K]] extends [AsyncResult<infer _A, infer _E>] ? _A : Arg[K]; } : never, [Arg] extends [ReadonlyArray<any>] ? AsyncResult.Failure<Arg[number]> : [Arg] extends [Iterable<infer _A>] ? AsyncResult.Failure<_A> : [Arg] extends [Record<string, any>] ? AsyncResult.Failure<Arg[keyof Arg]> : never>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.all`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Combines an iterable or record of `AsyncResult` and plain values into one `AsyncResult`, returning the first non-success result or a success of the collected values marked waiting when any input success is waiting. Call `AsyncResult.all` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/reactivity/AsyncResult.Schema (value)`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:946`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a schema for `AsyncResult` values using optional schemas for success values and failure errors.
- **Signature hint:** `declare function Schema<A extends Schema_.Constraint = Schema_.Never, E extends Schema_.Constraint = Schema_.Never>(options: { readonly success?: A | undefined; readonly error?: E | undefined; }): Schema<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.Schema`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a schema for `AsyncResult` values using optional schemas for success values and failure errors. Call `AsyncResult.Schema` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/reactivity/AsyncResult.Schema (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:926`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema interface for `AsyncResult` values, retaining the schemas used for success values and failure errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Schema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.isNotInitial`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:208`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when an `AsyncResult` is either `Success` or `Failure`.
- **Signature hint:** `declare function isNotInitial<A, E>(result: AsyncResult<A, E>): result is Success<A, E> | Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isNotInitial`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AsyncResult.isNotInitial` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.isSuccess`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:242`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when an `AsyncResult` is a `Success`.
- **Signature hint:** `declare function isSuccess<A, E>(result: AsyncResult<A, E>): result is Success<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isSuccess`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AsyncResult.isSuccess` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.isFailure`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:280`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when an `AsyncResult` is a `Failure`.
- **Signature hint:** `declare function isFailure<A, E>(result: AsyncResult<A, E>): result is Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isFailure`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AsyncResult.isFailure` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.isInterrupted`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:288`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when an `AsyncResult` is a `Failure` whose cause contains only interruptions.
- **Signature hint:** `declare function isInterrupted<A, E>(result: AsyncResult<A, E>): result is Failure<A, E>`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.isInterrupted`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `AsyncResult.isInterrupted` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.getOrElse`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:431`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Returns the available value from `value`, or evaluates the fallback when no current or previous success exists.
- **Signature hint:** `declare function getOrElse<B>(orElse: LazyArg<B>): <A, E>(self: AsyncResult<A, E>) => A | B declare function getOrElse<A, E, B>(self: AsyncResult<A, E>, orElse: LazyArg<B>): A | B`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.getOrElse`.
- **Suggested snippet:** Create a small representative input, call `AsyncResult.getOrElse`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.getOrThrow`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:442`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Returns the available value from `value`, or throws `NoSuchElementError` when no current or previous success exists.
- **Signature hint:** `declare function getOrThrow<A, E>(self: AsyncResult<A, E>): A`
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.getOrThrow`.
- **Suggested snippet:** Create a small representative input, call `AsyncResult.getOrThrow`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.AsyncResult (type) (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the state of an asynchronous value as `Initial`, `Success`, or `Failure`, with a `waiting` flag for in-flight refreshes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.AsyncResult (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.AsyncResult (type) (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:69`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers and the shared prototype shape for `AsyncResult` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.AsyncResult (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.AsyncResult.Proto`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:76`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Common prototype fields implemented by every `AsyncResult` variant, including pipeability, the type marker, phantom type members, and the `waiting` flag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.AsyncResult.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.AsyncResult.Success`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:90`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the success value type from an `AsyncResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.AsyncResult.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.AsyncResult.Failure`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:98`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the failure error type from an `AsyncResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.AsyncResult.Failure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.With`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:107`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Rebuilds an `AsyncResult` with new success and failure types while preserving the variant of another result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.With`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.Initial`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:156`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Initial `AsyncResult` state before a success value or failure cause is available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Initial`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.Success`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:230`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Successful `AsyncResult` containing the current value, its timestamp, and the shared waiting flag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.Failure`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:268`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Failed `AsyncResult` containing a failure cause and the latest previous success when one is available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Failure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.Defect`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:731`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type marker used by `Builder` to track whether defect failures still need to be handled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Defect`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.Interrupt`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:741`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type marker used by `Builder` to track whether interrupt failures still need to be handled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Interrupt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/reactivity/AsyncResult.Builder`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:751`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Fluent renderer for `AsyncResult` values that tracks unhandled cases at the type level and exposes `exhaustive` only after all possible cases are handled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AsyncResult.Builder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/reactivity/AsyncResult.TypeId (type)`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:38`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to recognize `AsyncResult` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/reactivity/AsyncResult.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/reactivity/AsyncResult.TypeId (value)`

- **Source:** `packages/effect/src/unstable/reactivity/AsyncResult.ts:46`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier attached to `AsyncResult` values and used by `isAsyncResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AsyncResult } from "effect/unstable/reactivity"` and use `AsyncResult.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `AsyncResult.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
