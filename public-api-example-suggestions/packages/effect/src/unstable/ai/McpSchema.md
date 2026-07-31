# Example Suggestions: `effect/unstable/ai/McpSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts`
- **Uncovered API records:** 123
- **Priorities:** 0 required, 25 recommended, 75 optional, 23 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/McpSchema.Resource`                        |  823 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ResourceContents`                |  921 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.TextResourceContents`            |  942 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.BlobResourceContents`            |  957 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.EmbeddedResource`                | 1251 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ResourceLink`                    | 1271 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ResourceReference`               | 1868 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.isParam`                         | 2475 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.param`                           | 2521 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.optionalWithDefault (value)`     |   55 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.INVALID_REQUEST_ERROR_CODE`      |  477 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.METHOD_NOT_FOUND_ERROR_CODE`     |  490 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.INVALID_PARAMS_ERROR_CODE`       |  502 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.INTERNAL_ERROR_CODE`             |  514 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.PARSE_ERROR_CODE`                |  526 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ParseError`                      |  543 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.InvalidRequest`                  |  564 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.MethodNotFound`                  |  584 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.InvalidParams`                   |  605 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.InternalError`                   |  627 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.McpError`                        |  642 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.InitializeResult`                |  685 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ResourceTemplate`                |  875 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ListResourcesResult`             |  971 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.ListResourceTemplatesResult`     |  997 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpSchema.Param`                           | 2490 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListResourceTemplates`           | 1010 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ReadResource`                    | 1033 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ResourceListChangedNotification` | 1060 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Subscribe`                       | 1071 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ResourceUpdatedNotification`     | 1116 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.optional`                        |   82 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.RequestId (value)`               |  102 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ProgressToken (value)`           |  122 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.RequestMeta`                     |  146 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ResultMeta`                      |  170 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.NotificationMeta`                |  189 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Cursor (value)`                  |  203 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.PaginatedRequestMeta`            |  228 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.PaginatedResultMeta`             |  248 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Role (value)`                    |  263 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Annotations`                     |  288 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Implementation`                  |  312 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ClientCapabilities`              |  334 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ServerCapabilities`              |  381 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.McpErrorBase`                    |  447 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Ping`                            |  669 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Initialize`                      |  712 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.InitializedNotification`         |  741 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CancelledNotification`           |  761 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ProgressNotification`            |  789 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListResources`                   |  984 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ReadResourceResult`              | 1022 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Unsubscribe`                     | 1092 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.PromptArgument`                  | 1136 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Prompt`                          | 1158 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.TextContent`                     | 1182 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ImageContent`                    | 1200 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.AudioContent`                    | 1223 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ContentBlock`                    | 1283 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.PromptMessage`                   | 1302 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListPromptsResult`               | 1313 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.GetPromptResult`                 | 1339 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ToolAnnotations`                 | 1412 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Tool`                            | 1458 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListToolsResult`                 | 1499 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListTools`                       | 1512 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CallToolResult`                  | 1533 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CallTool`                        | 1559 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ToolListChangedNotification`     | 1586 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.LoggingLevel (value)`            | 1602 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.LoggingLevel (type)`             | 1630 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.SetLevel`                        | 1638 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.LoggingMessageNotification`      | 1663 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.SamplingMessage`                 | 1692 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ModelHint`                       | 1708 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ModelPreferences`                | 1745 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CreateMessageResult`             | 1793 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CreateMessage`                   | 1823 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.PromptReference`                 | 1882 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CompleteResult`                  | 1897 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Complete`                        | 1935 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Root`                            | 1981 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListRootsResult`                 | 2008 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ListRoots`                       | 2029 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.RootsListChangedNotification`    | 2049 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ElicitAcceptResult`              | 2063 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ElicitDeclineResult`             | 2087 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ElicitResult`                    | 2106 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Elicit`                          | 2123 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ElicitationDeclined`             | 2152 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.McpServerClient`                 | 2175 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.McpServerClientMiddleware`       | 2193 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.EnabledWhen`                     | 2535 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.optionalWithDefault (type)`      |   39 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.RequestId (type)`                |  113 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.ProgressToken (type)`            |  133 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Cursor (type)`                   |  215 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.Role (type)`                     |  275 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpSchema.CompleteResult.empty`            | 1920 | `member`           | **optional**    |
| `effect/unstable/ai/McpSchema.ListPrompts`                     | 1327 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.GetPrompt`                       | 1356 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.PromptListChangedNotification`   | 1387 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.RequestEncoded`                  | 2208 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.NotificationEncoded`             | 2232 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.SuccessEncoded`                  | 2255 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.FailureEncoded`                  | 2278 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientRequestRpcs`               | 2306 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientRequestEncoded`            | 2328 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientNotificationRpcs`          | 2337 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientNotificationEncoded`       | 2350 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientRpcs`                      | 2358 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientSuccessEncoded`            | 2366 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ClientFailureEncoded`            | 2374 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerRequestRpcs`               | 2383 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerRequestEncoded`            | 2396 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerNotificationRpcs`          | 2406 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerNotificationEncoded`       | 2422 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerSuccessEncoded`            | 2430 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerFailureEncoded`            | 2438 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.ServerResultEncoded`             | 2446 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.FromClientEncoded`               | 2455 | `root-declaration` | **discouraged** |
| `effect/unstable/ai/McpSchema.FromServerEncoded`               | 2464 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/ai/McpSchema.Resource`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:823`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for a known resource that the server is capable of reading.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Resource`.
- **Suggested snippet:** Use `McpSchema.Resource` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ResourceContents`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:921`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for the contents of a specific resource or sub-resource.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResourceContents`.
- **Suggested snippet:** Use `McpSchema.ResourceContents` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.TextResourceContents`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:942`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for text resource contents represented as a string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.TextResourceContents`.
- **Suggested snippet:** Use `McpSchema.TextResourceContents` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.BlobResourceContents`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:957`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for binary resource contents represented as a `Uint8Array`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.BlobResourceContents`.
- **Suggested snippet:** Use `McpSchema.BlobResourceContents` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.EmbeddedResource`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1251`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Represents resource contents embedded into a prompt or tool call result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.EmbeddedResource`.
- **Suggested snippet:** Use `McpSchema.EmbeddedResource` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ResourceLink`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1271`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Represents a readable resource included in a prompt or tool call result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResourceLink`.
- **Suggested snippet:** Use `McpSchema.ResourceLink` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ResourceReference`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1868`
- **Kind / category:** `root-declaration` / `autocomplete`
- **Priority:** **recommended**
- **Current description:** Schema for a reference to a resource or resource template definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResourceReference`.
- **Suggested snippet:** Use `McpSchema.ResourceReference` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.isParam`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2475`
- **Kind / category:** `root-declaration` / `parameters`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a schema was created with `param` and therefore carries a resource URI template parameter name.
- **Signature hint:** `declare function isParam(schema: Schema.Constraint): schema is Param<string, Schema.Top>`
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.isParam`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `McpSchema.isParam` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.param`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2521`
- **Kind / category:** `root-declaration` / `parameters`
- **Priority:** **recommended**
- **Current description:** Creates a parameter for a resource URI template.
- **Signature hint:** `declare function param<const Name extends string, S extends Schema.Constraint>(name: Name, schema: S): Param<Name, S>`
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.param`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a parameter for a resource URI template. Call `McpSchema.param` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.optionalWithDefault (value)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:55`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Marks a struct field as optional and supplies `defaultValue` when the field is absent.
- **Signature hint:** `declare function optionalWithDefault<S extends Schema.Constraint & Schema.WithoutConstructorDefault>(schema: S, defaultValue: () => Schema.optionalKey<S>['Type']): optionalWithDefault<S>`
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.optionalWithDefault`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.optionalWithDefault`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.INVALID_REQUEST_ERROR_CODE`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:477`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the JSON-RPC error code for requests that are not valid request objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.INVALID_REQUEST_ERROR_CODE`.
- **Suggested snippet:** Use `McpSchema.INVALID_REQUEST_ERROR_CODE` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.METHOD_NOT_FOUND_ERROR_CODE`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:490`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the JSON-RPC error code for requests whose method does not exist or is not available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.METHOD_NOT_FOUND_ERROR_CODE`.
- **Suggested snippet:** Use `McpSchema.METHOD_NOT_FOUND_ERROR_CODE` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.INVALID_PARAMS_ERROR_CODE`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:502`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the JSON-RPC error code for invalid method parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.INVALID_PARAMS_ERROR_CODE`.
- **Suggested snippet:** Use `McpSchema.INVALID_PARAMS_ERROR_CODE` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.INTERNAL_ERROR_CODE`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:514`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the JSON-RPC error code for internal server errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.INTERNAL_ERROR_CODE`.
- **Suggested snippet:** Use `McpSchema.INTERNAL_ERROR_CODE` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.PARSE_ERROR_CODE`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:526`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the JSON-RPC error code for invalid JSON that could not be parsed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PARSE_ERROR_CODE`.
- **Suggested snippet:** Convert one representative external input with `McpSchema.PARSE_ERROR_CODE` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ParseError`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:543`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an MCP/JSON-RPC error for invalid JSON that could not be parsed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ParseError`.
- **Suggested snippet:** Create or capture `McpSchema.ParseError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.InvalidRequest`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:564`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an MCP/JSON-RPC error for a request object that is not valid.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.InvalidRequest`.
- **Suggested snippet:** Create or capture `McpSchema.InvalidRequest` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.MethodNotFound`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:584`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an MCP/JSON-RPC error for an unavailable method.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.MethodNotFound`.
- **Suggested snippet:** Create or capture `McpSchema.MethodNotFound` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.InvalidParams`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:605`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an MCP/JSON-RPC error for invalid method parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.InvalidParams`.
- **Suggested snippet:** Create or capture `McpSchema.InvalidParams` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.InternalError`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:627`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents an MCP/JSON-RPC error for unexpected internal server failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.InternalError`.
- **Suggested snippet:** Create or capture `McpSchema.InternalError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.McpError`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:642`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Schema for MCP protocol errors returned in JSON-RPC failure responses, including standard protocol errors and custom `McpErrorBase` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.McpError`.
- **Suggested snippet:** Create or capture `McpSchema.McpError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.InitializeResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:685`
- **Kind / category:** `root-declaration` / `initialization`
- **Priority:** **recommended**
- **Current description:** Schema for the server's response to an initialize request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.InitializeResult`.
- **Suggested snippet:** Use `McpSchema.InitializeResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ResourceTemplate`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:875`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for a template description of resources available on the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResourceTemplate`.
- **Suggested snippet:** Use `McpSchema.ResourceTemplate` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ListResourcesResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:971`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for the server's response to a resources/list request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListResourcesResult`.
- **Suggested snippet:** Use `McpSchema.ListResourcesResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpSchema.ListResourceTemplatesResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:997`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Schema for the server's response to a resources/templates/list request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListResourceTemplatesResult`.
- **Suggested snippet:** Use `McpSchema.ListResourceTemplatesResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/McpSchema.Param`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2490`
- **Kind / category:** `root-declaration` / `parameters`
- **Priority:** **optional**
- **Current description:** Schema wrapper used for resource URI template parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.Param`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListResourceTemplates`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1010`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Sent from the client to request a list of resource templates the server has.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListResourceTemplates`.
- **Suggested snippet:** Use `McpSchema.ListResourceTemplates` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ReadResource`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1033`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Sent from the client to the server, to read a specific resource URI.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ReadResource`.
- **Suggested snippet:** Use `McpSchema.ReadResource` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ResourceListChangedNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1060`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Represents a notification that the server's resource list changed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResourceListChangedNotification`.
- **Suggested snippet:** Use `McpSchema.ResourceListChangedNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Subscribe`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1071`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Subscribe`.
- **Suggested snippet:** Use `McpSchema.Subscribe` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ResourceUpdatedNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1116`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Sent from the server when a subscribed resource URI has changed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResourceUpdatedNotification`.
- **Suggested snippet:** Use `McpSchema.ResourceUpdatedNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.optional`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:82`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates an optional MCP struct-field schema from a required schema.
- **Signature hint:** `declare function optional<S extends Schema.Constraint>(schema: S): Schema.decodeTo<Schema.optional<S>, Schema.optionalKey<S>>`
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.optional`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.optional`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.RequestId (value)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:102`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for JSON-RPC request identifiers, allowing string or number ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.RequestId`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.RequestId`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ProgressToken (value)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:122`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for MCP progress tokens that associate progress notifications with the original request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ProgressToken`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.ProgressToken`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.RequestMeta`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:146`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for optional MCP request metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.RequestMeta`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.RequestMeta`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ResultMeta`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:170`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for optional MCP result metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ResultMeta`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.ResultMeta`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.NotificationMeta`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:189`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for optional MCP notification metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.NotificationMeta`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.NotificationMeta`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Cursor (value)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:203`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for opaque cursor tokens used in pagination.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Cursor`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.Cursor`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.PaginatedRequestMeta`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:228`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for MCP request metadata used by paginated requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PaginatedRequestMeta`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.PaginatedRequestMeta`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.PaginatedResultMeta`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:248`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for MCP result metadata returned by paginated operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PaginatedResultMeta`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.PaginatedResultMeta`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Role (value)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:263`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for MCP conversation roles, allowing user and assistant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Role`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.Role`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Annotations`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:288`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for optional client-facing annotations on MCP objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Annotations`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.Annotations`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Implementation`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:312`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Describes the name and version of an MCP implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Implementation`.
- **Suggested snippet:** Use `McpSchema.Implementation` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ClientCapabilities`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:334`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Describes capabilities advertised by an MCP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ClientCapabilities`.
- **Suggested snippet:** Use `McpSchema.ClientCapabilities` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ServerCapabilities`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:381`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Describes capabilities advertised by an MCP server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ServerCapabilities`.
- **Suggested snippet:** Use `McpSchema.ServerCapabilities` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.McpErrorBase`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:447`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for MCP and JSON-RPC error objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.McpErrorBase`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.McpErrorBase`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Ping`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:669`
- **Kind / category:** `root-declaration` / `ping`
- **Priority:** **optional**
- **Current description:** Represents an MCP ping request used to check whether the peer is still alive.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Ping`.
- **Suggested snippet:** Use `McpSchema.Ping` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Initialize`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:712`
- **Kind / category:** `root-declaration` / `initialization`
- **Priority:** **optional**
- **Current description:** Sent from the client to the server when it first connects, asking it to begin initialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Initialize`.
- **Suggested snippet:** Use `McpSchema.Initialize` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.InitializedNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:741`
- **Kind / category:** `root-declaration` / `initialization`
- **Priority:** **optional**
- **Current description:** Sent from the client to the server after initialization has finished.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.InitializedNotification`.
- **Suggested snippet:** Use `McpSchema.InitializedNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CancelledNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:761`
- **Kind / category:** `root-declaration` / `cancellation`
- **Priority:** **optional**
- **Current description:** Sent from either peer to cancel a previously issued request in the same direction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.CancelledNotification`.
- **Suggested snippet:** Use `McpSchema.CancelledNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ProgressNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:789`
- **Kind / category:** `root-declaration` / `progress`
- **Priority:** **optional**
- **Current description:** Sent from either peer to report progress for a long-running request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ProgressNotification`.
- **Suggested snippet:** Use `McpSchema.ProgressNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListResources`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:984`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Sent from the client to request a list of resources the server has.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListResources`.
- **Suggested snippet:** Use `McpSchema.ListResources` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ReadResourceResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1022`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Schema for the server's response to a resources/read request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ReadResourceResult`.
- **Suggested snippet:** Use `McpSchema.ReadResourceResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Unsubscribe`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1092`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **optional**
- **Current description:** Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Unsubscribe`.
- **Suggested snippet:** Use `McpSchema.Unsubscribe` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.PromptArgument`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1136`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Describes an argument that a prompt can accept.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PromptArgument`.
- **Suggested snippet:** Use `McpSchema.PromptArgument` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Prompt`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1158`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Represents a prompt or prompt template that the server offers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Prompt`.
- **Suggested snippet:** Use `McpSchema.Prompt` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.TextContent`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1182`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Represents text content provided to or from an LLM.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.TextContent`.
- **Suggested snippet:** Use `McpSchema.TextContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ImageContent`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1200`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Represents image content provided to or from an LLM.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ImageContent`.
- **Suggested snippet:** Use `McpSchema.ImageContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.AudioContent`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1223`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Represents audio content provided to or from an LLM.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.AudioContent`.
- **Suggested snippet:** Use `McpSchema.AudioContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ContentBlock`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1283`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for MCP content blocks that can appear in prompt messages or tool results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ContentBlock`.
- **Suggested snippet:** Define the smallest domain Schema involving `McpSchema.ContentBlock`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.PromptMessage`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1302`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Describes a message returned as part of a prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PromptMessage`.
- **Suggested snippet:** Use `McpSchema.PromptMessage` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListPromptsResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1313`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Represents the server response to a prompts/list request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListPromptsResult`.
- **Suggested snippet:** Use `McpSchema.ListPromptsResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.GetPromptResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1339`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Represents the server response to a prompts/get request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.GetPromptResult`.
- **Suggested snippet:** Create a small representative input, call `McpSchema.GetPromptResult`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ToolAnnotations`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1412`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Schema for additional properties describing a tool to clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ToolAnnotations`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `McpSchema.ToolAnnotations`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Tool`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1458`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Schema for the definition of a tool the client can call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Tool`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `McpSchema.Tool`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListToolsResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1499`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Schema for the server's response to a tools/list request from the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListToolsResult`.
- **Suggested snippet:** Use `McpSchema.ListToolsResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListTools`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1512`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Sent from the client to request a list of tools the server has.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListTools`.
- **Suggested snippet:** Use `McpSchema.ListTools` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CallToolResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1533`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Schema for the server's response to a tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.CallToolResult`.
- **Suggested snippet:** Use `McpSchema.CallToolResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CallTool`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1559`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Represents a client request to invoke a tool provided by the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.CallTool`.
- **Suggested snippet:** Use `McpSchema.CallTool` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ToolListChangedNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1586`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Represents a notification that the server's tool list changed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ToolListChangedNotification`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `McpSchema.ToolListChangedNotification`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.LoggingLevel (value)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1602`
- **Kind / category:** `root-declaration` / `logging`
- **Priority:** **optional**
- **Current description:** Schema for log message severity levels, mapped to syslog message severities as specified in RFC 5424 section 6.2.1: https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.LoggingLevel`.
- **Suggested snippet:** Use `McpSchema.LoggingLevel` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.LoggingLevel (type)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1630`
- **Kind / category:** `root-declaration` / `logging`
- **Priority:** **optional**
- **Current description:** Type represented by the MCP logging level schema, mapped to syslog message severities as specified in RFC 5424 section 6.2.1: https://datatracker.ietf.org/doc/html/rfc5424#section-6.2.1.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.LoggingLevel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.SetLevel`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1638`
- **Kind / category:** `root-declaration` / `logging`
- **Priority:** **optional**
- **Current description:** Sent from the client to the server to enable or adjust logging.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.SetLevel`.
- **Suggested snippet:** Use `McpSchema.SetLevel` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.LoggingMessageNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1663`
- **Kind / category:** `root-declaration` / `logging`
- **Priority:** **optional**
- **Current description:** Sent from the server to the client carrying a log message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.LoggingMessageNotification`.
- **Suggested snippet:** Use `McpSchema.LoggingMessageNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.SamplingMessage`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1692`
- **Kind / category:** `root-declaration` / `sampling`
- **Priority:** **optional**
- **Current description:** Describes a message issued to or received from an LLM API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.SamplingMessage`.
- **Suggested snippet:** Use `McpSchema.SamplingMessage` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ModelHint`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1708`
- **Kind / category:** `root-declaration` / `sampling`
- **Priority:** **optional**
- **Current description:** Schema for model selection hints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ModelHint`.
- **Suggested snippet:** Use `McpSchema.ModelHint` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ModelPreferences`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1745`
- **Kind / category:** `root-declaration` / `sampling`
- **Priority:** **optional**
- **Current description:** Schema for the server's model selection preferences requested of the client during sampling.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ModelPreferences`.
- **Suggested snippet:** Use `McpSchema.ModelPreferences` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CreateMessageResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1793`
- **Kind / category:** `root-declaration` / `sampling`
- **Priority:** **optional**
- **Current description:** Represents a client response to an MCP sampling request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.CreateMessageResult`.
- **Suggested snippet:** Construct one representative value with `McpSchema.CreateMessageResult`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CreateMessage`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1823`
- **Kind / category:** `root-declaration` / `sampling`
- **Priority:** **optional**
- **Current description:** Represents a server request for the client to sample an LLM.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.CreateMessage`.
- **Suggested snippet:** Construct one representative value with `McpSchema.CreateMessage`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.PromptReference`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1882`
- **Kind / category:** `root-declaration` / `autocomplete`
- **Priority:** **optional**
- **Current description:** Schema for a prompt reference used in autocomplete requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PromptReference`.
- **Suggested snippet:** Use `McpSchema.PromptReference` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CompleteResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1897`
- **Kind / category:** `root-declaration` / `autocomplete`
- **Priority:** **optional**
- **Current description:** Schema for the server's response to a completion/complete request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.CompleteResult`.
- **Suggested snippet:** Use `McpSchema.CompleteResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Complete`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1935`
- **Kind / category:** `root-declaration` / `autocomplete`
- **Priority:** **optional**
- **Current description:** Sent from the client to the server to ask for completion options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Complete`.
- **Suggested snippet:** Use `McpSchema.Complete` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Root`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1981`
- **Kind / category:** `root-declaration` / `roots`
- **Priority:** **optional**
- **Current description:** Represents a root directory or file that the server can operate on.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Root`.
- **Suggested snippet:** Use `McpSchema.Root` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListRootsResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2008`
- **Kind / category:** `root-declaration` / `roots`
- **Priority:** **optional**
- **Current description:** Represents a client response containing the roots available to the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListRootsResult`.
- **Suggested snippet:** Use `McpSchema.ListRootsResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ListRoots`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2029`
- **Kind / category:** `root-declaration` / `roots`
- **Priority:** **optional**
- **Current description:** Sent from the server to request a list of root URIs from the client. Roots allow servers to ask for specific directories or files to operate on. A common example for roots is providing a set of repositories or directories a server should operate on.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListRoots`.
- **Suggested snippet:** Use `McpSchema.ListRoots` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.RootsListChangedNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2049`
- **Kind / category:** `root-declaration` / `roots`
- **Priority:** **optional**
- **Current description:** Represents a notification that the client's root list changed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.RootsListChangedNotification`.
- **Suggested snippet:** Use `McpSchema.RootsListChangedNotification` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ElicitAcceptResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2063`
- **Kind / category:** `root-declaration` / `elicitation`
- **Priority:** **optional**
- **Current description:** Schema for an accepted client response to an elicitation request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ElicitAcceptResult`.
- **Suggested snippet:** Use `McpSchema.ElicitAcceptResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ElicitDeclineResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2087`
- **Kind / category:** `root-declaration` / `elicitation`
- **Priority:** **optional**
- **Current description:** Schema for a declined or canceled client response to an elicitation request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ElicitDeclineResult`.
- **Suggested snippet:** Use `McpSchema.ElicitDeclineResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ElicitResult`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2106`
- **Kind / category:** `root-declaration` / `elicitation`
- **Priority:** **optional**
- **Current description:** Schema for every client response to an elicitation request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ElicitResult`.
- **Suggested snippet:** Use `McpSchema.ElicitResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Elicit`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2123`
- **Kind / category:** `root-declaration` / `elicitation`
- **Priority:** **optional**
- **Current description:** Sent from the server asking the client to collect structured input from the user.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.Elicit`.
- **Suggested snippet:** Use `McpSchema.Elicit` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ElicitationDeclined`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2152`
- **Kind / category:** `root-declaration` / `elicitation`
- **Priority:** **optional**
- **Current description:** Error raised when an MCP elicitation request is declined or fails before accepted content is returned.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ElicitationDeclined`.
- **Suggested snippet:** Use `McpSchema.ElicitationDeclined` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.McpServerClient`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2175`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **optional**
- **Current description:** Service available while handling an MCP client request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.McpServerClient`.
- **Suggested snippet:** Consume `McpSchema.McpServerClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.McpServerClientMiddleware`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2193`
- **Kind / category:** `root-declaration` / `middleware`
- **Priority:** **optional**
- **Current description:** RPC middleware that provides `McpServerClient` to handlers for initialized MCP clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.McpServerClientMiddleware`.
- **Suggested snippet:** Use `McpSchema.McpServerClientMiddleware` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.EnabledWhen`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2535`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation to conditionally enable or disable tools based on client information.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.EnabledWhen`.
- **Suggested snippet:** Use `McpSchema.EnabledWhen` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.optionalWithDefault (type)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:39`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema type returned by `optionalWithDefault`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.optionalWithDefault`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.RequestId (type)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:113`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type represented by the JSON-RPC request identifier schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.RequestId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.ProgressToken (type)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:133`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type represented by the MCP progress token schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.ProgressToken`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Cursor (type)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:215`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type represented by the MCP cursor schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.Cursor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.Role (type)`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:275`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type represented by the MCP role schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpSchema.Role`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpSchema.CompleteResult.empty`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1920`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Empty completion result used when a completion request has no values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/McpSchema.CompleteResult.empty` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/ai/McpSchema.ListPrompts`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1327`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Sent from the client to request a list of prompts and prompt templates the server has.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ListPrompts`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.ListPrompts` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.GetPrompt`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1356`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Sent from the client to get a prompt provided by the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.GetPrompt`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.GetPrompt` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.PromptListChangedNotification`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:1387`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Represents a notification that the server's prompt list changed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.PromptListChangedNotification`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.PromptListChangedNotification` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.RequestEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2208`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded JSON-RPC request message for an RPC in `Group`, including the request id, method, and encoded payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.RequestEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.NotificationEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2232`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded notification message for an RPC in `Group`, including the method and encoded payload without a request id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.NotificationEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.SuccessEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2255`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded success response for an RPC in `Group`, containing the original request id and encoded result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.SuccessEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.FailureEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2278`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded failure response for an RPC in `Group`, containing the original request id and encoded error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.FailureEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientRequestRpcs`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2306`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC group for requests that MCP clients send to the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ClientRequestRpcs`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.ClientRequestRpcs` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientRequestEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2328`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded union of all client-to-server MCP request messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ClientRequestEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientNotificationRpcs`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2337`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC group for notifications that MCP clients send to the server, such as cancellation, progress, initialization completion, and roots list changes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ClientNotificationRpcs`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.ClientNotificationRpcs` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientNotificationEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2350`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded union of all client-to-server MCP notification messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ClientNotificationEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientRpcs`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2358`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC group combining all client-to-server MCP requests and notifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ClientRpcs`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.ClientRpcs` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientSuccessEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2366`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded success response sent by a client for a server-initiated request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ClientSuccessEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ClientFailureEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2374`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded failure response sent by a client for a server-initiated request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ClientFailureEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerRequestRpcs`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2383`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC group for requests that an MCP server can send to a client, including ping, sampling, roots listing, and elicitation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ServerRequestRpcs`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.ServerRequestRpcs` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerRequestEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2396`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded union of all server-to-client MCP request messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ServerRequestEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerNotificationRpcs`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2406`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC group for notifications that an MCP server can send to a client, including cancellation, progress, logging, and list or resource update notifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpSchema } from "effect/unstable/ai"` and use `McpSchema.ServerNotificationRpcs`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpSchema.ServerNotificationRpcs` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerNotificationEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2422`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded union of all server-to-client MCP notification messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ServerNotificationEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerSuccessEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2430`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded success response sent by the server for a client-initiated request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ServerSuccessEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerFailureEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2438`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded failure response sent by the server for a client-initiated request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ServerFailureEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.ServerResultEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2446`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded server response to a client request, either success or failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.ServerResultEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.FromClientEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2455`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded MCP messages accepted from a client by the server protocol: client requests and client notifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.FromClientEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/McpSchema.FromServerEncoded`

- **Source:** `packages/effect/src/unstable/ai/McpSchema.ts:2464`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Encoded MCP messages emitted by the server protocol to a client: server responses and server notifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/McpSchema.FromServerEncoded` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
