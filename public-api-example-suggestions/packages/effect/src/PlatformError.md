# Example Suggestions: `effect/PlatformError`

- **Package:** `effect`
- **Source:** `packages/effect/src/PlatformError.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 2 recommended, 6 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/PlatformError.systemError`          |  195 | `root-declaration` | **recommended** |
| `effect/PlatformError.badArgument`          |  216 | `root-declaration` | **recommended** |
| `effect/PlatformError.BadArgument`          |   36 | `root-declaration` | **optional**    |
| `effect/PlatformError.BadArgument.message`  |   51 | `member`           | **optional**    |
| `effect/PlatformError.SystemErrorTag`       |   75 | `root-declaration` | **optional**    |
| `effect/PlatformError.SystemError`          |  109 | `root-declaration` | **optional**    |
| `effect/PlatformError.SystemError.message`  |  127 | `member`           | **optional**    |
| `effect/PlatformError.PlatformError`        |  157 | `root-declaration` | **optional**    |
| `effect/PlatformError.PlatformError.TypeId` |  177 | `member`           | **discouraged** |

## Recommended

### `effect/PlatformError.systemError`

- **Source:** `packages/effect/src/PlatformError.ts:195`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `PlatformError` whose reason is a `SystemError`.
- **Signature hint:** `declare function systemError(options: { readonly _tag: SystemErrorTag; readonly module: string; readonly method: string; readonly description?: string | undefined; readonly syscall?: string | undefined; readonly pathOrDescriptor?: string | number | undefined; readonly cause?: unknown; }): PlatformError`
- **Import guidance:** Start from `import { PlatformError } from "effect"` and use `PlatformError.systemError`.
- **Suggested snippet:** Create or capture `PlatformError.systemError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PlatformError.badArgument`

- **Source:** `packages/effect/src/PlatformError.ts:216`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `PlatformError` whose reason is a `BadArgument`.
- **Signature hint:** `declare function badArgument(options: { readonly module: string; readonly method: string; readonly description?: string | undefined; readonly cause?: unknown; }): PlatformError`
- **Import guidance:** Start from `import { PlatformError } from "effect"` and use `PlatformError.badArgument`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `PlatformError` whose reason is a `BadArgument`. Call `PlatformError.badArgument` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/PlatformError.BadArgument`

- **Source:** `packages/effect/src/PlatformError.ts:36`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Error data for an invalid argument passed to a platform API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PlatformError } from "effect"` and use `PlatformError.BadArgument`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `PlatformError.BadArgument`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PlatformError.BadArgument.message`

- **Source:** `packages/effect/src/PlatformError.ts:51`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the module, method, and optional description that rejected the argument.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/PlatformError.BadArgument.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PlatformError.SystemErrorTag`

- **Source:** `packages/effect/src/PlatformError.ts:75`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Normalized category for failures reported by platform or system operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PlatformError.SystemErrorTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PlatformError.SystemError`

- **Source:** `packages/effect/src/PlatformError.ts:109`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Error data for a platform or system operation failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PlatformError } from "effect"` and use `PlatformError.SystemError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `PlatformError.SystemError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PlatformError.SystemError.message`

- **Source:** `packages/effect/src/PlatformError.ts:127`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the normalized system error tag with operation and path details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/PlatformError.SystemError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PlatformError.PlatformError`

- **Source:** `packages/effect/src/PlatformError.ts:157`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tagged error used by platform APIs to report either invalid arguments or system-level failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PlatformError } from "effect"` and use `PlatformError.PlatformError`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `PlatformError.PlatformError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/PlatformError.PlatformError.TypeId`

- **Source:** `packages/effect/src/PlatformError.ts:177`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a platform error wrapper for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/PlatformError.PlatformError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
