# Example Suggestions: `effect/LayerRef`

- **Package:** `effect`
- **Source:** `packages/effect/src/LayerRef.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 0 recommended, 13 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority     |
| ---------------------------------------- | ---: | ------------------ | ------------ |
| `effect/LayerRef.TagClass`               |  214 | `root-declaration` | **optional** |
| `effect/LayerRef.LayerRef`               |   43 | `root-declaration` | **optional** |
| `effect/LayerRef.LayerRef.rcRef`         |   49 | `member`           | **optional** |
| `effect/LayerRef.LayerRef.get`           |   54 | `member`           | **optional** |
| `effect/LayerRef.LayerRef.contextEffect` |   59 | `member`           | **optional** |
| `effect/LayerRef.LayerRef.invalidate`    |   64 | `member`           | **optional** |
| `effect/LayerRef.LayerRef.refresh`       |   70 | `member`           | **optional** |
| `effect/LayerRef.TagClass.layer`         |  226 | `member`           | **optional** |
| `effect/LayerRef.TagClass.layerNoDeps`   |  236 | `member`           | **optional** |
| `effect/LayerRef.TagClass.get`           |  241 | `member`           | **optional** |
| `effect/LayerRef.TagClass.contextEffect` |  246 | `member`           | **optional** |
| `effect/LayerRef.TagClass.invalidate`    |  251 | `member`           | **optional** |
| `effect/LayerRef.TagClass.refresh`       |  256 | `member`           | **optional** |

## Optional

### `effect/LayerRef.TagClass`

- **Source:** `packages/effect/src/LayerRef.ts:214`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Service class shape produced by `LayerRef.Service`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/LayerRef.TagClass`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.LayerRef`

- **Source:** `packages/effect/src/LayerRef.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A refreshable reference to a single layer-built service context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/LayerRef.LayerRef`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.LayerRef.rcRef`

- **Source:** `packages/effect/src/LayerRef.ts:49`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The underlying reference-counted cache that stores the built context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.LayerRef.rcRef` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.LayerRef.get`

- **Source:** `packages/effect/src/LayerRef.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Layer that provides the currently cached context, acquiring it if needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.LayerRef.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.LayerRef.contextEffect`

- **Source:** `packages/effect/src/LayerRef.ts:59`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Scoped effect that retrieves the currently cached context, acquiring it if needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.LayerRef.contextEffect` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.LayerRef.invalidate`

- **Source:** `packages/effect/src/LayerRef.ts:64`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidates the cached context so the next use rebuilds the layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.LayerRef.invalidate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.LayerRef.refresh`

- **Source:** `packages/effect/src/LayerRef.ts:70`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidates the cached context so the next use rebuilds the layer, and reacquires it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.LayerRef.refresh` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.TagClass.layer`

- **Source:** `packages/effect/src/LayerRef.ts:226`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Default layer for the `LayerRef` service, with dependencies applied.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.TagClass.layer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.TagClass.layerNoDeps`

- **Source:** `packages/effect/src/LayerRef.ts:236`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Default layer for the `LayerRef` service without provided dependencies.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.TagClass.layerNoDeps` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.TagClass.get`

- **Source:** `packages/effect/src/LayerRef.ts:241`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Layer that provides the currently cached context, requiring this service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.TagClass.get` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.TagClass.contextEffect`

- **Source:** `packages/effect/src/LayerRef.ts:246`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Scoped effect that retrieves the currently cached context through this service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.TagClass.contextEffect` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.TagClass.invalidate`

- **Source:** `packages/effect/src/LayerRef.ts:251`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidates the cached context through this service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.TagClass.invalidate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/LayerRef.TagClass.refresh`

- **Source:** `packages/effect/src/LayerRef.ts:256`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalidates the cached context through this service, and reacquires it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/LayerRef.TagClass.refresh` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
