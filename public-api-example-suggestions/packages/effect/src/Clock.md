# Example Suggestions: `effect/Clock`

- **Package:** `effect`
- **Source:** `packages/effect/src/Clock.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 1 recommended, 4 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority        |
| --------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Clock.monotonicTimeNanos`             |  326 | `root-declaration` | **recommended** |
| `effect/Clock.Clock.currentTimeMillis`        |   79 | `member`           | **optional**    |
| `effect/Clock.Clock.currentTimeNanos`         |  107 | `member`           | **optional**    |
| `effect/Clock.Clock.monotonicTimeNanos`       |  140 | `member`           | **optional**    |
| `effect/Clock.Clock.sleep`                    |  148 | `member`           | **optional**    |
| `effect/Clock.Clock.currentTimeMillisUnsafe`  |   65 | `member`           | **discouraged** |
| `effect/Clock.Clock.currentTimeNanosUnsafe`   |   93 | `member`           | **discouraged** |
| `effect/Clock.Clock.monotonicTimeNanosUnsafe` |  124 | `member`           | **discouraged** |

## Recommended

### `effect/Clock.monotonicTimeNanos`

- **Source:** `packages/effect/src/Clock.ts:326`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Returns an Effect that succeeds with the current monotonic time in nanoseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Clock } from "effect"` and use `Clock.monotonicTimeNanos`.
- **Suggested snippet:** Use `Clock.monotonicTimeNanos` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Clock.Clock.currentTimeMillis`

- **Source:** `packages/effect/src/Clock.ts:79`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the current Unix time in milliseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Clock.Clock.currentTimeMillis` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Clock.Clock.currentTimeNanos`

- **Source:** `packages/effect/src/Clock.ts:107`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the current Unix time in nanoseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Clock.Clock.currentTimeNanos` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Clock.Clock.monotonicTimeNanos`

- **Source:** `packages/effect/src/Clock.ts:140`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the current monotonic time in nanoseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Clock.Clock.monotonicTimeNanos` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Clock.Clock.sleep`

- **Source:** `packages/effect/src/Clock.ts:148`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Asynchronously sleeps for the specified duration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Clock.Clock.sleep` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Clock.Clock.currentTimeMillisUnsafe`

- **Source:** `packages/effect/src/Clock.ts:65`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Returns the current Unix time in milliseconds unsafely.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Clock.Clock.currentTimeMillisUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Clock.Clock.currentTimeNanosUnsafe`

- **Source:** `packages/effect/src/Clock.ts:93`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Returns the current Unix time in nanoseconds unsafely.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Clock.Clock.currentTimeNanosUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Clock.Clock.monotonicTimeNanosUnsafe`

- **Source:** `packages/effect/src/Clock.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Returns the current monotonic time in nanoseconds unsafely.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Clock.Clock.monotonicTimeNanosUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
