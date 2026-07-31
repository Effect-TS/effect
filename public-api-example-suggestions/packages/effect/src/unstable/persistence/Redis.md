# Example Suggestions: `effect/unstable/persistence/Redis`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/Redis.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 4 recommended, 2 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/Redis.Redis`                  |   28 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Redis.make`                   |   50 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Redis.RedisError`             |  103 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Redis.script`                 |  179 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Redis.Script`                 |  129 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Redis.Script.withReturnType`  |  146 | `member`           | **optional**    |
| `effect/unstable/persistence/Redis.RedisError.ErrorTypeId` |  112 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/persistence/Redis.Redis`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:28`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for sending Redis commands and evaluating cached Lua scripts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Redis } from "effect/unstable/persistence"` and use `Redis.Redis`.
- **Suggested snippet:** Consume `Redis.Redis` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Redis.make`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:50`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Redis` service from a raw command sender.
- **Signature hint:** `declare function make(options: { readonly send: <A = unknown>(command: string, ...args: ReadonlyArray<string>) => Effect.Effect<A, RedisError>; }): Effect.Effect<{ readonly send: <A = unknown>(command: string, ...args: ReadonlyArray<string>) => Effect.Effect<A, RedisError>; readonly eval: <Config extends { readonly params: ReadonlyArray<unknown>; readonly result: unknown; }>(script: Script<Config>) => (...params: Config['params']) => Effect.Effect<Config['result'], RedisError>; }, never, never>`
- **Import guidance:** Start from `import { Redis } from "effect/unstable/persistence"` and use `Redis.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Redis.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Redis.RedisError`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:103`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by Redis command or script execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Redis } from "effect/unstable/persistence"` and use `Redis.RedisError`.
- **Suggested snippet:** Create or capture `Redis.RedisError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Redis.script`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:179`
- **Kind / category:** `root-declaration` / `Scripting`
- **Priority:** **recommended**
- **Current description:** Constructs a typed Redis Lua script descriptor.
- **Signature hint:** `declare function script<Params extends ReadonlyArray<any>>(f: (...params: Params) => ReadonlyArray<unknown>, options: { readonly lua: string; readonly numberOfKeys: number | ((...params: Params) => number); }): Script<{ params: Params; result: void; }>`
- **Import guidance:** Start from `import { Redis } from "effect/unstable/persistence"` and use `Redis.script`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a typed Redis Lua script descriptor. Call `Redis.script` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/Redis.Script`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:129`
- **Kind / category:** `root-declaration` / `Scripting`
- **Priority:** **optional**
- **Current description:** Typed descriptor for a Redis Lua script.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Redis.Script`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Redis.Script.withReturnType`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:146`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the return type of the script.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/Redis.Script.withReturnType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/persistence/Redis.RedisError.ErrorTypeId`

- **Source:** `packages/effect/src/unstable/persistence/Redis.ts:112`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a Redis persistence error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/Redis.RedisError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
