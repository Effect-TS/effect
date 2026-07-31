# Example Suggestions: `effect/JsonPatch`

- **Package:** `effect`
- **Source:** `packages/effect/src/JsonPatch.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind     | Priority     |
| -------------------------------------------------------------- | ---: | -------- | ------------ |
| `effect/JsonPatch.JsonPatchOperation.path (member at line 73)` |   73 | `member` | **optional** |
| `effect/JsonPatch.JsonPatchOperation.path (member at line 86)` |   86 | `member` | **optional** |
| `effect/JsonPatch.JsonPatchOperation.path (member at line 98)` |   98 | `member` | **optional** |

## Optional

### `effect/JsonPatch.JsonPatchOperation.path (member at line 73)`

- **Source:** `packages/effect/src/JsonPatch.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** JSON Pointer to the target location. For arrays, the last token may be `-` to append.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/JsonPatch.JsonPatchOperation.path` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/JsonPatch.JsonPatchOperation.path (member at line 86)`

- **Source:** `packages/effect/src/JsonPatch.ts:86`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** JSON Pointer to the target location.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/JsonPatch.JsonPatchOperation.path` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/JsonPatch.JsonPatchOperation.path (member at line 98)`

- **Source:** `packages/effect/src/JsonPatch.ts:98`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** JSON Pointer to the target location. Use `""` to replace the root document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/JsonPatch.JsonPatchOperation.path` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
