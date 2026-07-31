# Example Suggestions: `effect/unstable/ai/Tool`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Tool.ts`
- **Uncovered API records:** 73
- **Priorities:** 0 required, 2 recommended, 64 optional, 7 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/Tool.getJsonSchemaFromSchema`         | 1676 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Tool.EmptyParams (value)`             | 2029 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Tool.EmptyParams (type)`              | 2010 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.getStrictMode`                   | 1893 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.FailureMode`                     |  116 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.NeedsApprovalContext`            |  125 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.NeedsApprovalContext.toolCallId` |  129 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.NeedsApprovalContext.messages`   |  133 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.NeedsApprovalFunction`           |  142 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.NeedsApproval`                   |  159 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Tool.id`                         |  214 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.name`                       |  219 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.description`                |  224 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.failureMode`                |  239 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.parametersSchema`           |  244 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.successSchema`              |  250 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.failureSchema`              |  256 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.annotations`                |  262 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.needsApproval`              |  275 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.setNeedsApproval`           |  280 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.addDependency`              |  294 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.setSuccess`                 |  301 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.setFailure`                 |  317 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.setParameters`              |  333 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.annotate`                   |  349 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Tool.annotateMerge`              |  354 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.ProviderDefined.id`              |  422 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.ProviderDefined.args`            |  427 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.ProviderDefined.argsSchema`      |  433 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.ProviderDefined.providerName`    |  438 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.ProviderDefined.requiresHandler` |  445 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Dynamic.jsonSchema`              |  519 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.Any`                             |  651 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.AnyProviderDefined`              |  666 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.AnyDynamic`                      |  682 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Name`                            |  705 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Parameters`                      |  718 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.ParametersEncoded`               |  731 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.ParametersSchema`                |  745 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Success`                         |  758 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.SuccessEncoded`                  |  772 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.SuccessSchema`                   |  786 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Failure`                         |  799 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.FailureEncoded`                  |  813 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.FailureResult`                   |  828 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.FailureResultEncoded`            |  842 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Result`                          |  861 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.ResultEncoded`                   |  880 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.HandlerServices`                 |  894 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.ResultEncodingServices`          |  914 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.ResultDecodingServices`          |  928 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.Handler`                         |  941 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.HandlerResult`                   |  954 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.HandlerResult.result`            |  958 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.HandlerResult.encodedResult`     |  964 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.HandlerResult.isFailure`         |  968 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.HandlerResult.preliminary`       |  974 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.HandlerOutput`                   |  990 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.HandlerError`                    | 1001 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.HandlersFor`                     | 1016 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.RequiresHandler`                 | 1028 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.NameMapper`                      | 1530 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Tool.NameMapper.customNames`          | 1546 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.NameMapper.providerNames`        | 1553 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.NameMapper.getCustomName`        | 1566 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.NameMapper.getProviderName`      | 1579 | `member`           | **optional**    |
| `effect/unstable/ai/Tool.unsafeSecureJsonParse`           | 1988 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/Tool.TypeId (value)`                  |   44 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/Tool.TypeId (type)`                   |   52 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/Tool.ProviderDefinedTypeId (value)`   |   65 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/Tool.ProviderDefinedTypeId (type)`    |   74 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/Tool.DynamicTypeId (value)`           |   87 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/Tool.DynamicTypeId (type)`            |   95 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/ai/Tool.getJsonSchemaFromSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1676`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Generates a JSON Schema from an Effect `Schema`.
- **Signature hint:** `declare function getJsonSchemaFromSchema<S extends Schema.Constraint>(schema: S, options?: { readonly transformer?: CodecTransformer; }): JsonSchema.JsonSchema`
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.getJsonSchemaFromSchema`.
- **Suggested snippet:** Create a small public Schema, call `Tool.getJsonSchemaFromSchema`, and assert a stable JSON Schema projection such as `type`, `required`, or one property schema rather than the entire metadata-rich document.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Tool.EmptyParams (value)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:2029`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for tools that accept no parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.EmptyParams`.
- **Suggested snippet:** Construct one representative value with `Tool.EmptyParams`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/Tool.EmptyParams (type)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:2010`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of the `EmptyParams` schema used for tools with no parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.EmptyParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.getStrictMode`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1893`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Returns the strict mode setting for a tool, or `undefined` if not set.
- **Signature hint:** `declare function getStrictMode<T extends Any>(tool: T): boolean | undefined`
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.getStrictMode`.
- **Suggested snippet:** Create a small representative input, call `Tool.getStrictMode`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.FailureMode`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:116`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The strategy used for handling errors returned from tool call handler execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.FailureMode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NeedsApprovalContext`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:125`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context provided to the `needsApproval` function when dynamically determining if a tool requires user approval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.NeedsApprovalContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NeedsApprovalContext.toolCallId`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:129`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The unique identifier of the tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.NeedsApprovalContext.toolCallId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NeedsApprovalContext.messages`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The conversation messages leading up to this tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.NeedsApprovalContext.messages` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NeedsApprovalFunction`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:142`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Function type for dynamically determining if a tool requires approval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.NeedsApprovalFunction`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NeedsApproval`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:159`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Specifies whether user approval is required before executing a tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.NeedsApproval`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.id`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:214`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool identifier which is used to uniquely identify the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.name`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:219`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.description`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:224`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The optional description of the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.failureMode`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:239`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The strategy used for handling errors returned from tool call handler execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.failureMode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.parametersSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:244`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A `Schema` representing the parameters that a tool must be called with.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.parametersSchema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.successSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:250`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A `Schema` representing the value that a tool must return when called if the tool call is successful.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.successSchema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.failureSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:256`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A `Schema` representing the value that a tool must return when called if it fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.failureSchema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.annotations`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:262`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A `Context` containing tool annotations which can store metadata about the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.annotations` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.needsApproval`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:275`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Specifies whether user approval is required before executing this tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.needsApproval` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.setNeedsApproval`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:280`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set whether user approval is required before executing this tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.setNeedsApproval` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.addDependency`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:294`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adds a _request-level_ dependency which must be provided before the tool call handler can be executed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.addDependency` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.setSuccess`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:301`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema to use to validate the result of a tool call when successful.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.setSuccess` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.setFailure`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:317`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema to use to validate the result of a tool call when it fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.setFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.setParameters`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:333`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema to use to validate the parameters of a tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.setParameters` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.annotate`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:349`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an annotation to the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Tool.annotateMerge`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:354`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add many annotations to the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Tool.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ProviderDefined.id`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:422`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** the identifier which is used to uniquely identify the provider-defined tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.ProviderDefined.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ProviderDefined.args`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:427`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The arguments passed to the provider-defined tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.ProviderDefined.args` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ProviderDefined.argsSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:433`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A `Schema` representing the arguments provided by the end-user which will be used to configure the behavior of the provider-defined tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.ProviderDefined.argsSchema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ProviderDefined.providerName`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:438`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool as recognized by the large language model provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.ProviderDefined.providerName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ProviderDefined.requiresHandler`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:445`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, this provider-defined tool will require a user-defined tool call handler to be provided when converting the `Toolkit` containing this tool into a `Layer`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.ProviderDefined.requiresHandler` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Dynamic.jsonSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:519`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The raw JSON Schema for parameters. Present when `parameters` was provided as a JSON Schema, `undefined` when an Effect Schema was used.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.Dynamic.jsonSchema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Any`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:651`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A type which represents any `Tool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.AnyProviderDefined`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:666`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A type which represents any provider-defined `Tool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.AnyProviderDefined`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.AnyDynamic`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:682`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A type which represents any dynamic `Tool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.AnyDynamic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Name`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:705`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the `Name` type from an `Tool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Name`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Parameters`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:718`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the type of the tool call parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Parameters`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ParametersEncoded`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:731`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the encoded type of the tool call parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.ParametersEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ParametersSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:745`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the schema for the parameters which an `Tool` must be called with.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.ParametersSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Success`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:758`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the type of the tool call result when it succeeds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.SuccessEncoded`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:772`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the encoded type of the tool call result when it succeeds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.SuccessEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.SuccessSchema`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:786`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the schema for the return type of a tool call when the tool call succeeds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.SuccessSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Failure`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:799`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the type of the tool call result when it fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Failure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.FailureEncoded`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:813`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the encoded type of the tool call result when it fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.FailureEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.FailureResult`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:828`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type for the actual failure value that can appear in tool results. When `failureMode` is `"return"`, this includes both user-defined failures and `AiError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.FailureResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.FailureResultEncoded`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:842`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** The encoded version of `FailureResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.FailureResultEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Result`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:861`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the type of the tool call result whether it succeeds or fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Result`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ResultEncoded`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:880`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the encoded type of the tool call result whether it succeeds or fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.ResultEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerServices`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:894`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the requirements of a `Tool` call handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.HandlerServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ResultEncodingServices`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:914`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the requirements needed to encode the result of a `Tool` call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.ResultEncodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.ResultDecodingServices`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:928`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the requirements needed to decode the result of a `Tool` call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.ResultDecodingServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.Handler`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:941`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an `Tool` that has been implemented within the application.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.Handler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerResult`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:954`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the result of calling the handler for a particular `Tool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.HandlerResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerResult.result`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:958`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The result of executing the handler for a particular tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.HandlerResult.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerResult.encodedResult`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:964`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The pre-encoded tool call result of executing the handler for a particular tool as a JSON-serializable value. The encoded result can be incorporated into subsequent requests to the large language model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.HandlerResult.encodedResult` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerResult.isFailure`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:968`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the result of executing the tool call handler was an error or not.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.HandlerResult.isFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerResult.preliminary`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:974`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this is a preliminary (intermediate) result or the final result. Preliminary results represent progress updates; only the final result should be used as the authoritative output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.HandlerResult.preliminary` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerOutput`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:990`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tagged union for incremental handler output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.HandlerOutput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlerError`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1001`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type which represents the possible errors that can be raised by a tool call's handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.HandlerError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.HandlersFor`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1016`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to create a union of `Handler` types for all tools in a record.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.HandlersFor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.RequiresHandler`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1028`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to determine if the specified tool requires a user-defined handler to be implemented.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Tool.RequiresHandler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NameMapper`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1530`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Maps between a provider-defined tool name and the name given to the tool by the Effect AI SDK.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.NameMapper`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Tool.NameMapper`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NameMapper.customNames`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1546`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a list of the user-specified tool names in the name mapper.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.NameMapper.customNames` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NameMapper.providerNames`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1553`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a list of the provider-specified tool names in the name mapper.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.NameMapper.providerNames` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NameMapper.getCustomName`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1566`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the user-specified tool name that corresponds with the provided provider-specified tool name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.NameMapper.getCustomName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tool.NameMapper.getProviderName`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1579`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns the provider-specified tool name that corresponds with the provided user-specified tool name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tool.NameMapper.getProviderName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/ai/Tool.unsafeSecureJsonParse`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:1988`
- **Kind / category:** `root-declaration` / `unsafe`
- **Priority:** **discouraged**
- **Current description:** Parses JSON text while rejecting prototype-pollution keys.
- **Signature hint:** `declare function unsafeSecureJsonParse(text: string): unknown`
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.unsafeSecureJsonParse`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Tool.unsafeSecureJsonParse` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/Tool.TypeId (value)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:44`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier carried by Effect AI tool values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Tool.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/Tool.TypeId (type)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:52`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level representation of the Effect AI tool runtime type identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/Tool.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/Tool.ProviderDefinedTypeId (value)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:65`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier carried by provider-defined tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.ProviderDefinedTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Tool.ProviderDefinedTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/Tool.ProviderDefinedTypeId (type)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:74`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level representation of the provider-defined tool runtime type identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/Tool.ProviderDefinedTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/Tool.DynamicTypeId (value)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:87`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier carried by dynamic tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tool } from "effect/unstable/ai"` and use `Tool.DynamicTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Tool.DynamicTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/Tool.DynamicTypeId (type)`

- **Source:** `packages/effect/src/unstable/ai/Tool.ts:95`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level representation of the dynamic tool runtime type identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/Tool.DynamicTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
