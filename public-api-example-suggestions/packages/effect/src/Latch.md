# Example Suggestions: `effect/Latch`

- **Package:** `effect`
- **Source:** `packages/effect/src/Latch.ts`
- **Uncovered API records:** 16
- **Priorities:** 0 required, 5 recommended, 7 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind               | Priority        |
| -------------------------------- | ---: | ------------------ | --------------- |
| `effect/Latch.release`           |  275 | `root-declaration` | **recommended** |
| `effect/Latch.open`              |  231 | `root-declaration` | **recommended** |
| `effect/Latch.await`             |  305 | `root-declaration` | **recommended** |
| `effect/Latch.close`             |  327 | `root-declaration` | **recommended** |
| `effect/Latch.whenOpen`          |  375 | `root-declaration` | **recommended** |
| `effect/Latch.isOpen`            |  397 | `root-declaration` | **optional**    |
| `effect/Latch.Latch.open`        |   63 | `member`           | **optional**    |
| `effect/Latch.Latch.release`     |   81 | `member`           | **optional**    |
| `effect/Latch.Latch.await`       |   90 | `member`           | **optional**    |
| `effect/Latch.Latch.close`       |   99 | `member`           | **optional**    |
| `effect/Latch.Latch.whenOpen`    |  118 | `member`           | **optional**    |
| `effect/Latch.Latch.isOpen`      |  127 | `member`           | **optional**    |
| `effect/Latch.openUnsafe`        |  254 | `root-declaration` | **discouraged** |
| `effect/Latch.closeUnsafe`       |  351 | `root-declaration` | **discouraged** |
| `effect/Latch.Latch.openUnsafe`  |   72 | `member`           | **discouraged** |
| `effect/Latch.Latch.closeUnsafe` |  108 | `member`           | **discouraged** |

## Recommended

### `effect/Latch.release`

- **Source:** `packages/effect/src/Latch.ts:275`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Releases the fibers currently waiting on a closed latch without opening it.
- **Signature hint:** `declare function release(self: Latch): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.release`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Latch.release`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Latch.open`

- **Source:** `packages/effect/src/Latch.ts:231`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Opens the latch and releases fibers waiting on it.
- **Signature hint:** `declare function open(self: Latch): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.open`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Latch.open`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Latch.await`

- **Source:** `packages/effect/src/Latch.ts:305`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Waits for the latch to be opened.
- **Signature hint:** `declare function await(self: Latch): Effect.Effect<void>`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.await`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Latch.await`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Latch.close`

- **Source:** `packages/effect/src/Latch.ts:327`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Closes the latch so future `await` and `whenOpen` calls suspend.
- **Signature hint:** `declare function close(self: Latch): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.close`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Latch.close`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Latch.whenOpen`

- **Source:** `packages/effect/src/Latch.ts:375`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Waits on the latch, then runs the provided effect.
- **Signature hint:** `declare function whenOpen(self: Latch): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function whenOpen<A, E, R>(self: Latch, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.whenOpen`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Latch.whenOpen`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Latch.isOpen`

- **Source:** `packages/effect/src/Latch.ts:397`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Checks whether the latch is currently open or closed.
- **Signature hint:** `declare function isOpen(self: Latch): boolean`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.isOpen`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `Latch.isOpen`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Latch.Latch.open`

- **Source:** `packages/effect/src/Latch.ts:63`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Opens the latch, releasing all fibers waiting on it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Latch.Latch.open` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Latch.Latch.release`

- **Source:** `packages/effect/src/Latch.ts:81`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Releases all fibers currently waiting on the latch without opening it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Latch.Latch.release` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Latch.Latch.await`

- **Source:** `packages/effect/src/Latch.ts:90`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Waits for the latch to be opened or released.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Latch.Latch.await` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Latch.Latch.close`

- **Source:** `packages/effect/src/Latch.ts:99`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Closes the latch so future waiters suspend again.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Latch.Latch.close` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Latch.Latch.whenOpen`

- **Source:** `packages/effect/src/Latch.ts:118`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs the given effect only after the latch allows waiting fibers to continue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Latch.Latch.whenOpen` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Latch.Latch.isOpen`

- **Source:** `packages/effect/src/Latch.ts:127`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Checks whether the latch is currently open or closed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Latch.Latch.isOpen` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Latch.openUnsafe`

- **Source:** `packages/effect/src/Latch.ts:254`
- **Kind / category:** `root-declaration` / `unsafe`
- **Priority:** **discouraged**
- **Current description:** Opens the latch synchronously and releases fibers waiting on it.
- **Signature hint:** `declare function openUnsafe(self: Latch): boolean`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.openUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Latch.openUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Latch.closeUnsafe`

- **Source:** `packages/effect/src/Latch.ts:351`
- **Kind / category:** `root-declaration` / `unsafe`
- **Priority:** **discouraged**
- **Current description:** Closes the latch synchronously so future `await` and `whenOpen` calls suspend.
- **Signature hint:** `declare function closeUnsafe(self: Latch): boolean`
- **Import guidance:** Start from `import { Latch } from "effect"` and use `Latch.closeUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Latch.closeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Latch.Latch.openUnsafe`

- **Source:** `packages/effect/src/Latch.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Opens the latch synchronously, releasing all fibers waiting on it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Latch.Latch.openUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Latch.Latch.closeUnsafe`

- **Source:** `packages/effect/src/Latch.ts:108`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Closes the latch synchronously so future waiters suspend again.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Latch.Latch.closeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
