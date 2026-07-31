# Example Suggestions: `effect/unstable/rpc/RpcGroup`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 0 recommended, 21 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority     |
| --------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/rpc/RpcGroup.HandlerServices`            |  219 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup`                   |   35 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.Any`                        |  176 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.HandlersFrom`               |  187 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.HandlerFrom`                |  198 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.HandlersServices`           |  208 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.Rpcs`                       |  248 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.make`                       |  402 | `root-declaration` | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.add`               |   45 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.merge`             |   52 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.omit`              |   59 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.middleware`        |   66 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.prefix`            |   71 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.toHandlers`        |   77 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.toLayer`           |   95 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.toLayerHandler`    |  115 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.accessHandler`     |  135 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.annotate`          |  151 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.annotateRpcs`      |  156 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.annotateMerge`     |  161 | `member`           | **optional** |
| `effect/unstable/rpc/RpcGroup.RpcGroup.annotateRpcsMerge` |  166 | `member`           | **optional** |

## Optional

### `effect/unstable/rpc/RpcGroup.HandlerServices`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:219`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** Computes the services required by a single RPC handler, excluding services provided by middleware and `Scope` where the server supplies it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.HandlerServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:35`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** A collection of RPC definitions that can be composed, annotated, and converted into server handlers or layers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.RpcGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.Any`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:176`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** An erased `RpcGroup` type for APIs that only need to know that a value is an RPC group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.HandlersFrom`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:187`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** Builds the object type of server handler functions required to implement each RPC in a union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.HandlersFrom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.HandlerFrom`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:198`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** Extracts the server handler function type for a specific RPC tag from an RPC union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.HandlerFrom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.HandlersServices`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:208`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** Computes the services required by all handlers in a handler object for an RPC union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.HandlersServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.Rpcs`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:248`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** Extracts the union of RPC definitions from an `RpcGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcGroup.Rpcs`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.make`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:402`
- **Kind / category:** `root-declaration` / `groups`
- **Priority:** **optional**
- **Current description:** Creates an `RpcGroup` from one or more RPC definitions.
- **Signature hint:** `declare function make<const Rpcs extends ReadonlyArray<Rpc.Any>>(...rpcs: Rpcs): RpcGroup<Rpcs[number]>`
- **Import guidance:** Start from `import { RpcGroup } from "effect/unstable/rpc"` and use `RpcGroup.make`.
- **Suggested snippet:** Construct one representative value with `RpcGroup.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.add`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:45`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add one or more procedures to the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.add` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.merge`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:52`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Merge this group with one or more other groups.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.merge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.omit`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:59`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Omit one or more procedures from the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.omit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.middleware`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:66`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add middleware to all the procedures added to the group until this point.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.middleware` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.prefix`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:71`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add a prefix to the procedures in this group, returning a new group
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.toHandlers`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:77`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Implement the handlers for the procedures in this group, returning a context object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.toHandlers` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.toLayer`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:95`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Implement the handlers for the procedures in this group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.toLayer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.toLayerHandler`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Implement a single handler from the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.toLayerHandler` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.accessHandler`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:135`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Retrieve a handler for a specific procedure in the group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.accessHandler` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.annotate`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:151`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the group with a value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.annotateRpcs`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:156`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the Rpc's above this point with a value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.annotateRpcs` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.annotateMerge`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:161`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the group with the provided annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcGroup.RpcGroup.annotateRpcsMerge`

- **Source:** `packages/effect/src/unstable/rpc/RpcGroup.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the Rpc's above this point with the provided annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcGroup.RpcGroup.annotateRpcsMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
