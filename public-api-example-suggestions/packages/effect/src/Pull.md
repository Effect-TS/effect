# Example Suggestions: `effect/Pull`

- **Package:** `effect`
- **Source:** `packages/effect/src/Pull.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 8 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind               | Priority        |
| -------------------------------- | ---: | ------------------ | --------------- |
| `effect/Pull.catchDone`          |  157 | `root-declaration` | **recommended** |
| `effect/Pull.isDoneCause`        |  186 | `root-declaration` | **recommended** |
| `effect/Pull.isDoneFailure`      |  203 | `root-declaration` | **recommended** |
| `effect/Pull.filterDone`         |  223 | `root-declaration` | **recommended** |
| `effect/Pull.filterDoneVoid`     |  251 | `root-declaration` | **recommended** |
| `effect/Pull.filterNoDone`       |  277 | `root-declaration` | **recommended** |
| `effect/Pull.filterDoneLeftover` |  297 | `root-declaration` | **recommended** |
| `effect/Pull.doneExitFromCause`  |  325 | `root-declaration` | **recommended** |
| `effect/Pull.Error`              |   77 | `root-declaration` | **optional**    |
| `effect/Pull.Services`           |  114 | `root-declaration` | **optional**    |
| `effect/Pull.ExcludeDone`        |  130 | `root-declaration` | **optional**    |
| `effect/Pull.Success`            |   59 | `root-declaration` | **optional**    |
| `effect/Pull.Leftover`           |   96 | `root-declaration` | **optional**    |
| `effect/Pull.Pull`               |   40 | `root-declaration` | **optional**    |

## Recommended

### `effect/Pull.catchDone`

- **Source:** `packages/effect/src/Pull.ts:157`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Handles `Cause.Done` failures in an effect while leaving ordinary failures in the error channel.
- **Signature hint:** `declare function catchDone<E, A2, E2, R2>(f: (leftover: Cause.Done.Extract<E>) => Effect<A2, E2, R2>): <A, R>(self: Effect<A, E, R>) => Effect<A | A2, ExcludeDone<E> | E2, R | R2> declare function catchDone<A, R, E, A2, E2, R2>(self: Effect<A, E, R>, f: (leftover: Cause.Done.Extract<E>) => Effect<A2, E2, R2>): Effect<A | A2, ExcludeDone<E> | E2, R | R2>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.catchDone`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Pull.catchDone`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.isDoneCause`

- **Source:** `packages/effect/src/Pull.ts:186`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Checks whether a Cause contains any done errors.
- **Signature hint:** `declare function isDoneCause<E>(cause: Cause.Cause<E>): boolean`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.isDoneCause`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Pull.isDoneCause`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.isDoneFailure`

- **Source:** `packages/effect/src/Pull.ts:203`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Checks whether a `Cause.Reason` is a `Fail` reason whose error is a `Cause.Done` signal.
- **Signature hint:** `declare function isDoneFailure<E>(failure: Cause.Reason<E>): failure is Cause.Fail<E & Cause.Done<any>>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.isDoneFailure`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Pull.isDoneFailure` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.filterDone`

- **Source:** `packages/effect/src/Pull.ts:223`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Finds a `Cause.Done` failure in a `Cause`.
- **Signature hint:** `declare function filterDone<E>(input: Cause.Cause<E>): Result.Result<Cause.Done.Only<E>, Cause.Cause<ExcludeDone<E>>>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.filterDone`.
- **Suggested snippet:** Call `Pull.filterDone` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.filterDoneVoid`

- **Source:** `packages/effect/src/Pull.ts:251`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Finds a `Cause.Done` failure in a cause whose done value is not used.
- **Signature hint:** `declare function filterDoneVoid<E extends Cause.Done>(input: Cause.Cause<E>): Result.Result<Cause.Done, Cause.Cause<Exclude<E, Cause.Done>>>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.filterDoneVoid`.
- **Suggested snippet:** Call `Pull.filterDoneVoid` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.filterNoDone`

- **Source:** `packages/effect/src/Pull.ts:277`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Keeps a `Cause` only when it contains no `Cause.Done` failures.
- **Signature hint:** `declare function filterNoDone<E>(input: Cause.Cause<E>): Result.Result<Cause.Cause<ExcludeDone<E>>, Cause.Cause<E>>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.filterNoDone`.
- **Suggested snippet:** Call `Pull.filterNoDone` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.filterDoneLeftover`

- **Source:** `packages/effect/src/Pull.ts:297`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Filters a Cause to extract the leftover value from done errors.
- **Signature hint:** `declare function filterDoneLeftover<E>(cause: Cause.Cause<E>): Result.Result<Cause.Done.Extract<E>, Cause.Cause<ExcludeDone<E>>>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.filterDoneLeftover`.
- **Suggested snippet:** Call `Pull.filterDoneLeftover` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pull.doneExitFromCause`

- **Source:** `packages/effect/src/Pull.ts:325`
- **Kind / category:** `root-declaration` / `Done`
- **Priority:** **recommended**
- **Current description:** Converts a `Cause` into an `Exit`, treating `Cause.Done` as successful completion.
- **Signature hint:** `declare function doneExitFromCause<E>(cause: Cause.Cause<E>): Exit.Exit<Cause.Done.Extract<E>, ExcludeDone<E>>`
- **Import guidance:** Start from `import { Pull } from "effect"` and use `Pull.doneExitFromCause`.
- **Suggested snippet:** Call `Pull.doneExitFromCause` with the smallest representative input and assert the returned `Exit` using semantic `Exit` and `Cause` constructors. Contrast success with one relevant failure only when both outcomes clarify the conversion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Pull.Error`

- **Source:** `packages/effect/src/Pull.ts:77`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the error type from a Pull type, excluding Done errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pull.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pull.Services`

- **Source:** `packages/effect/src/Pull.ts:114`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the service requirements (context) type from a Pull type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pull.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pull.ExcludeDone`

- **Source:** `packages/effect/src/Pull.ts:130`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Excludes `Cause.Done` completion signals from an error type union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pull.ExcludeDone`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pull.Success`

- **Source:** `packages/effect/src/Pull.ts:59`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the success type from a Pull type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pull.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pull.Leftover`

- **Source:** `packages/effect/src/Pull.ts:96`
- **Kind / category:** `root-declaration` / `type extractors`
- **Priority:** **optional**
- **Current description:** Extracts the leftover type from a Pull type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pull.Leftover`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pull.Pull`

- **Source:** `packages/effect/src/Pull.ts:40`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An effectful pull step that either produces a value, fails with `E`, or signals completion with `Cause.Done<Done>`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pull.Pull`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
