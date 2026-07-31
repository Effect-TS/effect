# Example Suggestions: `effect/Context`

- **Package:** `effect`
- **Source:** `packages/effect/src/Context.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 1 recommended, 5 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind                    | Priority        |
| ------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Context.getOrUndefined`             |  840 | `root-declaration`      | **recommended** |
| `effect/Context.mutate`                     | 1253 | `root-declaration`      | **optional**    |
| `effect/Context.Key`                        |   65 | `root-declaration`      | **optional**    |
| `effect/Context.ServiceClass (type) (type)` |  125 | `root-declaration`      | **optional**    |
| `effect/Context.ServiceClass (type) (type)` |  138 | `namespace`             | **optional**    |
| `effect/Context.ServiceClass.Shape`         |  146 | `namespace-declaration` | **optional**    |
| `effect/Context.ServiceTypeId (type)`       |   33 | `root-declaration`      | **discouraged** |
| `effect/Context.ServiceTypeId (value)`      |   42 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/Context.getOrUndefined`

- **Source:** `packages/effect/src/Context.ts:840`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Returns the service currently stored for a key, or `undefined` when the key is absent.
- **Signature hint:** `declare function getOrUndefined<S, I>(key: Key<I, S>): <Services>(self: Context<Services>) => S | undefined declare function getOrUndefined<Services, S, I>(self: Context<Services>, key: Key<I, S>): S | undefined`
- **Import guidance:** Start from `import { Context } from "effect"` and use `Context.getOrUndefined`.
- **Suggested snippet:** Create a small representative input, call `Context.getOrUndefined`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Context.mutate`

- **Source:** `packages/effect/src/Context.ts:1253`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Performs a series of mutations on a `Context`. Prevents unnecessary copying of the underlying map when multiple mutations are needed.
- **Signature hint:** `declare function mutate<Services, B>(f: (context: Context<Services>) => Context<B>): <Services>(self: Context<Services>) => Context<B> declare function mutate<Services, B>(self: Context<Services>, f: (context: Context<Services>) => Context<B>): Context<B>`
- **Import guidance:** Start from `import { Context } from "effect"` and use `Context.mutate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Performs a series of mutations on a `Context`. Prevents unnecessary copying of the underlying map when multiple mutations are needed. Call `Context.mutate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Context.Key`

- **Source:** `packages/effect/src/Context.ts:65`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Typed identifier for a service stored in a `Context`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Context.Key`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Context.ServiceClass (type) (type)`

- **Source:** `packages/effect/src/Context.ts:125`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Class-style service key produced by `Context.Service<Self, Shape>()("Id")`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Context.ServiceClass (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Context.ServiceClass (type) (type)`

- **Source:** `packages/effect/src/Context.ts:138`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing helper types for class-style `Context.Service` declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Context.ServiceClass (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Context.ServiceClass.Shape`

- **Source:** `packages/effect/src/Context.ts:146`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Runtime and type-level metadata carried by a class-style service key, including its service type identifier, string key, and service shape.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Context.ServiceClass.Shape`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Context.ServiceTypeId (type)`

- **Source:** `packages/effect/src/Context.ts:33`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** String literal type used as the runtime type identifier for `Context` service keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Context.ServiceTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Context.ServiceTypeId (value)`

- **Source:** `packages/effect/src/Context.ts:42`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier attached to `Context` service keys and used by `isKey` to recognize them.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Context } from "effect"` and use `Context.ServiceTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Context.ServiceTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
