# Example Suggestions: `@effect/vitest/utils`

- **Package:** `@effect/vitest`
- **Source:** `packages/vitest/src/utils.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 10 recommended, 11 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/vitest/utils.fail`               |   31 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.doesNotThrow`       |   84 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.throws`             |  159 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.throwsAsync`        |  182 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.assertNone`         |  211 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.assertSome`         |  251 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.assertSuccess`      |  269 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.assertFailure`      |  283 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.assertExitFailure`  |  301 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.assertExitSuccess`  |  315 | `root-declaration` | **recommended** |
| `@effect/vitest/utils.deepStrictEqual`    |   41 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.notDeepStrictEqual` |   51 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.strictEqual`        |   61 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertEquals`       |   71 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertInstanceOf`   |   98 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertTrue`         |  113 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertFalse`        |  123 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertInclude`      |  133 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertMatch`        |  147 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertDefined`      |  221 | `root-declaration` | **optional**    |
| `@effect/vitest/utils.assertUndefined`    |  236 | `root-declaration` | **optional**    |

## Recommended

### `@effect/vitest/utils.fail`

- **Source:** `packages/vitest/src/utils.ts:31`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Fails the current test with the provided error message.
- **Signature hint:** `declare function fail(message: string): void`
- **Import guidance:** Start from `import { fail } from "@effect/vitest/utils"` and use `fail`.
- **Suggested snippet:** Use `fail` as the operation under test in a call to `throws`, pass a stable message, and validate that message without allowing the intentional assertion failure to fail the documentation test.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.doesNotThrow`

- **Source:** `packages/vitest/src/utils.ts:84`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `thunk` does not throw an error.
- **Signature hint:** `declare function doesNotThrow(thunk: () => void, message?: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { doesNotThrow } from "@effect/vitest/utils"` and use `doesNotThrow`.
- **Suggested snippet:** Pass `doesNotThrow` a deterministic thunk that completes normally. The helper's successful completion is the assertion, so do not add a redundant trailing value assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.throws`

- **Source:** `packages/vitest/src/utils.ts:159`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `thunk` throws, optionally checking the thrown value against an expected `Error` or validation function.
- **Signature hint:** `declare function throws(thunk: () => void, error?: Error | ((u: unknown) => undefined), ..._: Array<never>): void`
- **Import guidance:** Start from `import { throws } from "@effect/vitest/utils"` and use `throws`.
- **Suggested snippet:** Pass `throws` a thunk that throws one specific `Error` and validate that error with the helper's expected-error or validator argument. Do not add another assertion around the assertion helper.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.throwsAsync`

- **Source:** `packages/vitest/src/utils.ts:182`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `thunk` throws or returns a rejected promise, optionally checking the failure value against an expected `Error` or validation function.
- **Signature hint:** `declare function throwsAsync(thunk: () => Promise<void>, error?: Error | ((u: unknown) => undefined), ..._: Array<never>): Promise<void>`
- **Import guidance:** Start from `import { throwsAsync } from "@effect/vitest/utils"` and use `throwsAsync`.
- **Suggested snippet:** Await `throwsAsync` with a thunk returning one predictably rejected Promise and validate the rejection with the helper's expected-error or validator argument.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.assertNone`

- **Source:** `packages/vitest/src/utils.ts:211`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `option` is `None`.
- **Signature hint:** `declare function assertNone<A>(option: Option.Option<A>, ..._: Array<never>): asserts option is Option.None<never>`
- **Import guidance:** Start from `import { assertNone } from "@effect/vitest/utils"` and use `assertNone`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertNone`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.assertSome`

- **Source:** `packages/vitest/src/utils.ts:251`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `option` is `Some` and contains a value equal to `expected`.
- **Signature hint:** `declare function assertSome<A>(option: Option.Option<A>, expected: A, ..._: Array<never>): asserts option is Option.Some<A>`
- **Import guidance:** Start from `import { assertSome } from "@effect/vitest/utils"` and use `assertSome`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertSome`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.assertSuccess`

- **Source:** `packages/vitest/src/utils.ts:269`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `result` is `Success` and contains a value equal to `expected`.
- **Signature hint:** `declare function assertSuccess<A, E>(result: Result.Result<A, E>, expected: A, ..._: Array<never>): asserts result is Result.Success<A, never>`
- **Import guidance:** Start from `import { assertSuccess } from "@effect/vitest/utils"` and use `assertSuccess`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertSuccess`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.assertFailure`

- **Source:** `packages/vitest/src/utils.ts:283`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `result` is `Failure` and contains an error equal to `expected`.
- **Signature hint:** `declare function assertFailure<A, E>(result: Result.Result<A, E>, expected: E, ..._: Array<never>): asserts result is Result.Failure<never, E>`
- **Import guidance:** Start from `import { assertFailure } from "@effect/vitest/utils"` and use `assertFailure`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertFailure`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.assertExitFailure`

- **Source:** `packages/vitest/src/utils.ts:301`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `exit` is a failure with a cause equal to `expected`.
- **Signature hint:** `declare function assertExitFailure<A, E>(exit: Exit.Exit<A, E>, expected: Cause.Cause<E>, ..._: Array<never>): asserts exit is Exit.Failure<never, E>`
- **Import guidance:** Start from `import { assertExitFailure } from "@effect/vitest/utils"` and use `assertExitFailure`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertExitFailure`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/vitest/utils.assertExitSuccess`

- **Source:** `packages/vitest/src/utils.ts:315`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Asserts that `exit` is a success with a value equal to `expected`.
- **Signature hint:** `declare function assertExitSuccess<A, E>(exit: Exit.Exit<A, E>, expected: A, ..._: Array<never>): asserts exit is Exit.Success<A, never>`
- **Import guidance:** Start from `import { assertExitSuccess } from "@effect/vitest/utils"` and use `assertExitSuccess`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertExitSuccess`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/vitest/utils.deepStrictEqual`

- **Source:** `packages/vitest/src/utils.ts:41`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `actual` is deeply strictly equal to `expected` using Node's `assert.deepStrictEqual`.
- **Signature hint:** `declare function deepStrictEqual<A>(actual: A, expected: A, message?: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { deepStrictEqual } from "@effect/vitest/utils"` and use `deepStrictEqual`.
- **Suggested snippet:** Call `deepStrictEqual` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.notDeepStrictEqual`

- **Source:** `packages/vitest/src/utils.ts:51`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `actual` is not deeply strictly equal to `expected` using Node's `assert.notDeepStrictEqual`.
- **Signature hint:** `declare function notDeepStrictEqual<A>(actual: A, expected: A, message?: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { notDeepStrictEqual } from "@effect/vitest/utils"` and use `notDeepStrictEqual`.
- **Suggested snippet:** Call `notDeepStrictEqual` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.strictEqual`

- **Source:** `packages/vitest/src/utils.ts:61`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `actual` is strictly equal to `expected` using Node's `assert.strictEqual`.
- **Signature hint:** `declare function strictEqual<A>(actual: A, expected: A, message?: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { strictEqual } from "@effect/vitest/utils"` and use `strictEqual`.
- **Suggested snippet:** Call `strictEqual` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertEquals`

- **Source:** `packages/vitest/src/utils.ts:71`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `actual` is equal to `expected` using the `Equal.equals` trait.
- **Signature hint:** `declare function assertEquals<A>(actual: A, expected: A, message?: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { assertEquals } from "@effect/vitest/utils"` and use `assertEquals`.
- **Suggested snippet:** Call `assertEquals` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertInstanceOf`

- **Source:** `packages/vitest/src/utils.ts:98`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `value` is an instance of `constructor`.
- **Signature hint:** `declare function assertInstanceOf<C extends abstract new (...args: any) => any>(value: unknown, constructor: C, message?: string, ..._: Array<never>): asserts value is InstanceType<C>`
- **Import guidance:** Start from `import { assertInstanceOf } from "@effect/vitest/utils"` and use `assertInstanceOf`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertInstanceOf`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertTrue`

- **Source:** `packages/vitest/src/utils.ts:113`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `self` is `true`.
- **Signature hint:** `declare function assertTrue(self: unknown, message?: string, ..._: Array<never>): asserts self`
- **Import guidance:** Start from `import { assertTrue } from "@effect/vitest/utils"` and use `assertTrue`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertTrue`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertFalse`

- **Source:** `packages/vitest/src/utils.ts:123`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `self` is `false`.
- **Signature hint:** `declare function assertFalse(self: boolean, message?: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { assertFalse } from "@effect/vitest/utils"` and use `assertFalse`.
- **Suggested snippet:** Call `assertFalse` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertInclude`

- **Source:** `packages/vitest/src/utils.ts:133`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `actual` includes `expected`.
- **Signature hint:** `declare function assertInclude(actual: string | undefined, expected: string, ..._: Array<never>): void`
- **Import guidance:** Start from `import { assertInclude } from "@effect/vitest/utils"` and use `assertInclude`.
- **Suggested snippet:** Call `assertInclude` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertMatch`

- **Source:** `packages/vitest/src/utils.ts:147`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `actual` matches `regExp`.
- **Signature hint:** `declare function assertMatch(actual: string, regExp: RegExp, ..._: Array<never>): void`
- **Import guidance:** Start from `import { assertMatch } from "@effect/vitest/utils"` and use `assertMatch`.
- **Suggested snippet:** Call `assertMatch` once with values satisfying the documented assertion. Successful completion is the semantic assertion, so avoid a redundant trailing value assertion or an unguarded failing case.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertDefined`

- **Source:** `packages/vitest/src/utils.ts:221`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `a` is not `undefined`.
- **Signature hint:** `declare function assertDefined<A>(a: A | undefined, ..._: Array<never>): asserts a is Exclude<A, undefined>`
- **Import guidance:** Start from `import { assertDefined } from "@effect/vitest/utils"` and use `assertDefined`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertDefined`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/vitest/utils.assertUndefined`

- **Source:** `packages/vitest/src/utils.ts:236`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Asserts that `a` is `undefined`.
- **Signature hint:** `declare function assertUndefined<A>(a: A | undefined, ..._: Array<never>): asserts a is undefined`
- **Import guidance:** Start from `import { assertUndefined } from "@effect/vitest/utils"` and use `assertUndefined`.
- **Suggested snippet:** Declare a value with the broad input type, pass one satisfying value to `assertUndefined`, and use the narrowed value afterward when the assertion signature provides useful narrowing. Test rejection only by wrapping an invalid call in `throws`; never invoke an expected-to-throw assertion unguarded.
- **Optional contrast:** Use one satisfying input; include rejection only inside a throw assertion when it is useful and documented.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
