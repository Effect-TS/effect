# Example Suggestions: `effect/unstable/ai/Toolkit`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 0 recommended, 19 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority     |
| ------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/ai/Toolkit.empty`                      |  453 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.Toolkit.tools`              |   79 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.Toolkit.of`                 |   84 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.Toolkit.toHandlers`         |   90 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.Toolkit.toLayer`            |   98 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.HandlerContext`             |  112 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.HandlerContext.toolCallId`  |  116 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.HandlerContext.preliminary` |  125 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.Any`                        |  134 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.Tools`                      |  146 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.ToolsByName`                |  155 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.HandlersFrom`               |  171 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.WithHandler`                |  188 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.WithHandler.tools`          |  192 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.WithHandler.handle`         |  203 | `member`           | **optional** |
| `effect/unstable/ai/Toolkit.WithHandlerTools`           |  233 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.SimplifyRecord`             |  506 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.MergeRecords`               |  514 | `root-declaration` | **optional** |
| `effect/unstable/ai/Toolkit.MergedTools`                |  528 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/ai/Toolkit.empty`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:453`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** An empty toolkit with no tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Toolkit } from "effect/unstable/ai"` and use `Toolkit.empty`.
- **Suggested snippet:** Construct one representative value with `Toolkit.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.Toolkit.tools`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:79`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A record containing all tools in this toolkit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.Toolkit.tools` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.Toolkit.of`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:84`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A helper method which can be used for type-safe handler declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.Toolkit.of` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.Toolkit.toHandlers`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:90`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Converts a toolkit into a `Context` containing handlers for each tool in the toolkit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.Toolkit.toHandlers` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.Toolkit.toLayer`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:98`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Converts a toolkit into a `Layer` containing handlers for each tool in the toolkit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.Toolkit.toLayer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.HandlerContext`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:112`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context provided to tool handlers during execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.HandlerContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.HandlerContext.toolCallId`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:116`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The unique identifier of the tool call, when available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.HandlerContext.toolCallId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.HandlerContext.preliminary`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:125`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Emit a preliminary result during long-running tool calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.HandlerContext.preliminary` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.Any`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:134`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Represents any `Toolkit` instance, used for generic constraints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.Tools`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:146`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which can be used to extract the tool definitions from a toolkit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.Tools`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.ToolsByName`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:155`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which transforms either a record or an array of tools into a record where keys are tool names and values are the tool instances.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.ToolsByName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.HandlersFrom`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:171`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type that maps tool names to their required handler functions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.HandlersFrom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.WithHandler`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:188`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A toolkit instance with registered handlers ready for tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.WithHandler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.WithHandler.tools`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:192`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tools available in this toolkit instance.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.WithHandler.tools` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.WithHandler.handle`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:203`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes a tool call by name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Toolkit.WithHandler.handle` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.WithHandlerTools`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:233`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which can be used to extract the tools from a toolkit with handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.WithHandlerTools`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.SimplifyRecord`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:506`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which flattens a record type for improved IDE display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.SimplifyRecord`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.MergeRecords`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:514`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which merges a union of tool records into a single record.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.MergeRecords`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Toolkit.MergedTools`

- **Source:** `packages/effect/src/unstable/ai/Toolkit.ts:528`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which merges the tools from multiple toolkits into a single record.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Toolkit.MergedTools`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
