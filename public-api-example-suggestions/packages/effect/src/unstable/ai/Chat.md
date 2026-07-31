# Example Suggestions: `effect/unstable/ai/Chat`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Chat.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 4 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind                    | Priority        |
| --------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/ai/Chat.makePersisted`                   |  802 | `root-declaration`      | **recommended** |
| `effect/unstable/ai/Chat.layerPersisted`                  |  964 | `root-declaration`      | **recommended** |
| `effect/unstable/ai/Chat.ChatNotFoundError`               |  702 | `root-declaration`      | **recommended** |
| `effect/unstable/ai/Chat.Persistence (value)`             |  721 | `root-declaration`      | **recommended** |
| `effect/unstable/ai/Chat.Service`                         |  104 | `root-declaration`      | **optional**    |
| `effect/unstable/ai/Chat.Persistence (type)`              |  730 | `namespace`             | **optional**    |
| `effect/unstable/ai/Chat.Persistence.Service`             |  738 | `namespace-declaration` | **optional**    |
| `effect/unstable/ai/Chat.Persistence.Service.get`         |  744 | `member`                | **optional**    |
| `effect/unstable/ai/Chat.Persistence.Service.getOrCreate` |  754 | `member`                | **optional**    |
| `effect/unstable/ai/Chat.Persisted`                       |  772 | `root-declaration`      | **optional**    |
| `effect/unstable/ai/Chat.Persisted.id`                    |  776 | `member`                | **optional**    |
| `effect/unstable/ai/Chat.Persisted.save`                  |  781 | `member`                | **optional**    |

## Recommended

### `effect/unstable/ai/Chat.makePersisted`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:802`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a new chat persistence service.
- **Signature hint:** `declare function makePersisted(options: { readonly storeId: string; }): Effect.Effect<Persistence.Service, never, Scope | BackingPersistence>`
- **Import guidance:** Start from `import { Chat } from "effect/unstable/ai"` and use `Chat.makePersisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Chat.makePersisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Chat.layerPersisted`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:964`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Layer` for a new chat persistence service.
- **Signature hint:** `declare function layerPersisted(options: { readonly storeId: string; }): Layer.Layer<Persistence, never, BackingPersistence>`
- **Import guidance:** Start from `import { Chat } from "effect/unstable/ai"` and use `Chat.layerPersisted`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Chat.layerPersisted`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Chat.ChatNotFoundError`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:702`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when attempting to retrieve a persisted `Chat` that does not exist in the backing persistence store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Chat } from "effect/unstable/ai"` and use `Chat.ChatNotFoundError`.
- **Suggested snippet:** Create or capture `Chat.ChatNotFoundError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Chat.Persistence (value)`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:721`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for persistence-backed AI conversation storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Chat } from "effect/unstable/ai"` and use `Chat.Persistence`.
- **Suggested snippet:** Consume `Chat.Persistence` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/Chat.Service`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:104`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the interface that the `Chat` service provides.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Chat.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persistence (type)`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:730`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the service contract for chat persistence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Chat.Persistence`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persistence.Service`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:738`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the backing persistence for a persisted `Chat`. Allows for creating and retrieving chats that have been saved to a persistence store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Chat.Persistence.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persistence.Service.get`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:744`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Attempts to retrieve the persisted chat from the backing persistence store with the specified chat identifer. If the chat does not exist in the persistence store, a `ChatNotFoundError` will be returned.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Chat.Persistence.Service.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persistence.Service.getOrCreate`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:754`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Attempts to retrieve the persisted chat from the backing persistence store with the specified chat identifer. If the chat does not exist in the persistence store, an empty chat will be created, saved, and returned.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Chat.Persistence.Service.getOrCreate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persisted`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:772`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a `Chat` that is backed by persistence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Chat.Persisted`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persisted.id`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:776`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The identifier for the chat in the backing persistence store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Chat.Persisted.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Chat.Persisted.save`

- **Source:** `packages/effect/src/unstable/ai/Chat.ts:781`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Saves the current chat history into the backing persistence store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Chat.Persisted.save` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
