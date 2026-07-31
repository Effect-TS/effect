# Example Suggestions: `effect/unstable/ai/Prompt`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Prompt.ts`
- **Uncovered API records:** 129
- **Priorities:** 0 required, 10 recommended, 119 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                    | Line | Kind               | Priority        |
| ---------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/Prompt.ProviderOptions (value)`                    |   40 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.isPart`                                     |   66 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.TextPart`                                   |  271 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.ReasoningPart`                              |  355 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.FilePart`                                   |  466 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.ToolCallPart`                               |  584 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.ToolResultPart`                             |  702 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.toolResultPart`                             |  730 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.isMessage`                                  |  998 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.isPrompt`                                   | 1784 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Prompt.ProviderOptions (type)`                     |   52 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.TextPartOptions`                            |  263 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.textPart`                                   |  295 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ReasoningPartOptions`                       |  347 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.reasoningPart`                              |  377 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.FilePartOptions`                            |  458 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.filePart`                                   |  499 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPartOptions`                        |  576 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.toolCallPart`                               |  612 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPartOptions`                      |  694 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePartOptions`            |  818 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePart`                   |  826 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.toolApprovalResponsePart`                   |  852 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPartOptions`             |  924 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPart`                    |  932 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.toolApprovalRequestPart`                    |  956 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Part (value)`                               |  966 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ContentFromString`                          | 1101 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.SystemMessageOptions`                       | 1177 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.SystemMessage`                              | 1185 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.systemMessage`                              | 1207 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.UserMessagePart (value)`                    | 1291 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.UserMessageOptions`                         | 1303 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.UserMessage`                                | 1311 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.userMessage`                                | 1389 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessagePart (value)`               | 1489 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessageOptions`                    | 1514 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessage`                           | 1528 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.assistantMessage`                           | 1603 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessagePart (value)`                    | 1683 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessageOptions`                         | 1697 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessage`                                | 1705 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.toolMessage`                                | 1729 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Message (value)`                            | 1765 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Prompt (value)`                             | 1825 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Part (type)`                                |   80 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.PartEncoded`                                |   95 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.BasePart`                                   |  115 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.BasePart.type`                              |  120 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BasePart.options`                           |  124 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BasePartEncoded`                            |  133 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.BasePartEncoded.type`                       |  137 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BasePartEncoded.options`                    |  141 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.PartConstructorParams`                      |  203 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.PartConstructorParams.options`              |  207 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.TextPart.text`                              |  240 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.TextPartEncoded`                            |  249 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.TextPartEncoded.text`                       |  253 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ReasoningPart.text`                         |  324 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ReasoningPartEncoded`                       |  333 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ReasoningPartEncoded.text`                  |  337 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.FilePart.mediaType`                         |  419 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.FilePart.fileName`                          |  423 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.FilePart.data`                              |  427 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.FilePartEncoded`                            |  436 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.FilePartEncoded.mediaType`                  |  440 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.FilePartEncoded.fileName`                   |  444 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.FilePartEncoded.data`                       |  448 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPart.id`                            |  529 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPart.name`                          |  533 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPart.params`                        |  537 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPart.providerExecuted`              |  541 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPartEncoded`                        |  550 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPartEncoded.id`                     |  554 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPartEncoded.name`                   |  558 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPartEncoded.params`                 |  562 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolCallPartEncoded.providerExecuted`       |  566 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPart.id`                          |  647 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPart.name`                        |  651 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPart.isFailure`                   |  655 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPart.result`                      |  659 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPartEncoded`                      |  668 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPartEncoded.id`                   |  672 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPartEncoded.name`                 |  676 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPartEncoded.isFailure`            |  680 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolResultPartEncoded.result`               |  684 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePart.approvalId`        |  777 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePart.approved`          |  781 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePart.reason`            |  785 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded`            |  794 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.approvalId` |  800 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.approved`   |  804 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.reason`     |  808 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPart.approvalId`         |  891 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPart.toolCallId`         |  895 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded`             |  904 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded.approvalId`  |  910 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded.toolCallId`  |  914 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BaseMessage`                                | 1011 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.BaseMessage.role`                           | 1016 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BaseMessage.options`                        | 1020 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BaseMessageEncoded`                         | 1029 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.BaseMessageEncoded.role`                    | 1033 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.BaseMessageEncoded.options`                 | 1037 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.MessageConstructorParams`                   | 1087 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.MessageConstructorParams.options`           | 1091 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.SystemMessage.content`                      | 1154 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.SystemMessageEncoded`                       | 1163 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.SystemMessageEncoded.content`               | 1167 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.UserMessage.content`                        | 1253 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.UserMessagePart (type)`                     | 1262 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.UserMessageEncoded`                         | 1270 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.UserMessageEncoded.content`                 | 1274 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.UserMessagePartEncoded`                     | 1283 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessage.content`                   | 1442 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessagePart (type)`                | 1451 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessageEncoded`                    | 1465 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.AssistantMessagePartEncoded`                | 1475 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessage.content`                        | 1645 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessagePart (type)`                     | 1654 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessageEncoded`                         | 1662 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessageEncoded.content`                 | 1666 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.ToolMessagePartEncoded`                     | 1675 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Message (type)`                             | 1741 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.MessageEncoded`                             | 1753 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Prompt (type)`                              | 1793 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.Prompt.content`                             | 1798 | `member`           | **optional**    |
| `effect/unstable/ai/Prompt.PromptEncoded`                              | 1807 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Prompt.PromptEncoded.content`                      | 1811 | `member`           | **optional**    |

## Recommended

### `effect/unstable/ai/Prompt.ProviderOptions (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:40`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **recommended**
- **Current description:** Schema for provider-specific options that can be attached to content parts and messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ProviderOptions`.
- **Suggested snippet:** Use `Prompt.ProviderOptions` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.isPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:66`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is a Part.
- **Signature hint:** `declare function isPart(u: unknown): u is Part`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.isPart`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Prompt.isPart` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.TextPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:271`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of text parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.TextPart`.
- **Suggested snippet:** Use `Prompt.TextPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.ReasoningPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:355`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of reasoning parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ReasoningPart`.
- **Suggested snippet:** Use `Prompt.ReasoningPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.FilePart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:466`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of file parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.FilePart`.
- **Suggested snippet:** Use `Prompt.FilePart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.ToolCallPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:584`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of tool call parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ToolCallPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.ToolCallPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.ToolResultPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:702`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of tool result parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ToolResultPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.ToolResultPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.toolResultPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:730`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a new tool result part.
- **Signature hint:** `declare function toolResultPart(params: PartConstructorParams<ToolResultPart>): ToolResultPart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.toolResultPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.toolResultPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.isMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:998`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is a Message.
- **Signature hint:** `declare function isMessage(u: unknown): u is Message`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.isMessage`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Prompt.isMessage` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Prompt.isPrompt`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1784`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is a Prompt.
- **Signature hint:** `declare function isPrompt(u: unknown): u is Prompt`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.isPrompt`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Prompt.isPrompt` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/Prompt.ProviderOptions (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:52`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Type of provider-specific options that can be attached to prompt messages and content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ProviderOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.TextPartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:263`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `TextPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.TextPartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.textPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:295`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new text part.
- **Signature hint:** `declare function textPart(params: PartConstructorParams<TextPart>): TextPart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.textPart`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a new text part. Call `Prompt.textPart` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ReasoningPartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:347`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `ReasoningPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ReasoningPartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.reasoningPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:377`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new reasoning part.
- **Signature hint:** `declare function reasoningPart(params: PartConstructorParams<ReasoningPart>): ReasoningPart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.reasoningPart`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a new reasoning part. Call `Prompt.reasoningPart` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:458`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `FilePart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.FilePartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.filePart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:499`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `FilePart` for prompt file attachments.
- **Signature hint:** `declare function filePart(params: PartConstructorParams<FilePart>): FilePart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.filePart`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a `FilePart` for prompt file attachments. Call `Prompt.filePart` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:576`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `ToolCallPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolCallPartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.toolCallPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:612`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool call part.
- **Signature hint:** `declare function toolCallPart(params: PartConstructorParams<ToolCallPart>): ToolCallPart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.toolCallPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.toolCallPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:694`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `ToolResultPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolResultPartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:818`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `ToolApprovalResponsePart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolApprovalResponsePartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:826`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of tool approval response parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ToolApprovalResponsePart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.ToolApprovalResponsePart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.toolApprovalResponsePart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:852`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool approval response part.
- **Signature hint:** `declare function toolApprovalResponsePart(params: PartConstructorParams<ToolApprovalResponsePart>): ToolApprovalResponsePart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.toolApprovalResponsePart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.toolApprovalResponsePart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPartOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:924`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `ToolApprovalRequestPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolApprovalRequestPartOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:932`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of tool approval request parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ToolApprovalRequestPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.ToolApprovalRequestPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.toolApprovalRequestPart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:956`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool approval request part.
- **Signature hint:** `declare function toolApprovalRequestPart(params: PartConstructorParams<ToolApprovalRequestPart>): ToolApprovalRequestPart`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.toolApprovalRequestPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.toolApprovalRequestPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Part (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:966`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.Part`.
- **Suggested snippet:** Use `Prompt.Part` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ContentFromString`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1101`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema that decodes a string into content containing a single `TextPart` and, when encoding, emits the `text` value of the first part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ContentFromString`.
- **Suggested snippet:** Use `Prompt.ContentFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.SystemMessageOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1177`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `SystemMessage` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.SystemMessageOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.SystemMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1185`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of system messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.SystemMessage`.
- **Suggested snippet:** Use `Prompt.SystemMessage` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.systemMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1207`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new system message.
- **Signature hint:** `declare function systemMessage(params: MessageConstructorParams<SystemMessage>): SystemMessage`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.systemMessage`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a new system message. Call `Prompt.systemMessage` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessagePart (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1291`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of user message content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.UserMessagePart`.
- **Suggested snippet:** Use `Prompt.UserMessagePart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessageOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1303`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `UserMessage` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.UserMessageOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1311`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of user messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.UserMessage`.
- **Suggested snippet:** Use `Prompt.UserMessage` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.userMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1389`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new user message.
- **Signature hint:** `declare function userMessage(params: MessageConstructorParams<UserMessage>): UserMessage`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.userMessage`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a new user message. Call `Prompt.userMessage` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessagePart (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1489`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of assistant message content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.AssistantMessagePart`.
- **Suggested snippet:** Use `Prompt.AssistantMessagePart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessageOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1514`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `AssistantMessage` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.AssistantMessageOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1528`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of assistant messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.AssistantMessage`.
- **Suggested snippet:** Use `Prompt.AssistantMessage` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.assistantMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1603`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new assistant message.
- **Signature hint:** `declare function assistantMessage(params: MessageConstructorParams<AssistantMessage>): AssistantMessage`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.assistantMessage`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a new assistant message. Call `Prompt.assistantMessage` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessagePart (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1683`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of tool message content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ToolMessagePart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.ToolMessagePart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessageOptions`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1697`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represents provider-specific options that can be associated with a `ToolMessage` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolMessageOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1705`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of tool messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.ToolMessage`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.ToolMessage`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.toolMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1729`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool message.
- **Signature hint:** `declare function toolMessage(params: MessageConstructorParams<ToolMessage>): ToolMessage`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.toolMessage`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.toolMessage`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Message (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1765`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.Message`.
- **Suggested snippet:** Use `Prompt.Message` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Prompt (value)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1825`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for AI prompt instances.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/ai"` and use `Prompt.Prompt`.
- **Suggested snippet:** Use `Prompt.Prompt` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Part (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:80`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type representing all possible content parts within messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.Part`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.PartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:95`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of a Part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.PartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BasePart`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:115`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface for all content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.BasePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BasePart.type`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:120`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The type of this content part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BasePart.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BasePart.options`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Provider-specific options for this part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BasePart.options` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BasePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:133`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface for encoded content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.BasePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BasePartEncoded.type`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:137`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The type of this content part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BasePartEncoded.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BasePartEncoded.options`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:141`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Provider-specific options for this part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BasePartEncoded.options` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.PartConstructorParams`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:203`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type for specifying the parameters required to construct a specific part of a prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.PartConstructorParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.PartConstructorParams.options`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:207`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional provider-specific options for this part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.PartConstructorParams.options` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.TextPart.text`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:240`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.TextPart.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.TextPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:249`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of text parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.TextPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.TextPartEncoded.text`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:253`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.TextPartEncoded.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ReasoningPart.text`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:324`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reasoning or thought process text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ReasoningPart.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ReasoningPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:333`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of reasoning parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ReasoningPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ReasoningPartEncoded.text`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:337`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reasoning or thought process text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ReasoningPartEncoded.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePart.mediaType`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:419`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MIME type of the file (e.g., "image/jpeg", "application/pdf").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.FilePart.mediaType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePart.fileName`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:423`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional filename for the file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.FilePart.fileName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePart.data`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:427`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** File data as base64 string of data, a byte array, or a URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.FilePart.data` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:436`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of file parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.FilePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePartEncoded.mediaType`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:440`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MIME type of the file (e.g., "image/jpeg", "application/pdf").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.FilePartEncoded.mediaType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePartEncoded.fileName`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:444`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional filename for the file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.FilePartEncoded.fileName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.FilePartEncoded.data`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:448`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** File data as base64 string of data, a byte array, or a URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.FilePartEncoded.data` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPart.id`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:529`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPart.name`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:533`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool to invoke.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPart.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPart.params`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:537`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Parameters to pass to the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPart.params` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPart.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:541`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPart.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:550`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool call parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolCallPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:554`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPartEncoded.name`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:558`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool to invoke.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPartEncoded.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPartEncoded.params`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:562`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Parameters to pass to the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPartEncoded.params` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolCallPartEncoded.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:566`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolCallPartEncoded.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPart.id`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:647`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the original tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPart.name`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:651`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool that was executed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPart.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPart.isFailure`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:655`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not the result of executing the tool call handler was an error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPart.isFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPart.result`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:659`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The result returned by the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPart.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:668`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool result parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolResultPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:672`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the original tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPartEncoded.name`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:676`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool that was executed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPartEncoded.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPartEncoded.isFailure`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:680`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not the result of executing the tool call handler was an error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPartEncoded.isFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolResultPartEncoded.result`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:684`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The result returned by the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolResultPartEncoded.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePart.approvalId`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:777`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** References the original approval request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalResponsePart.approvalId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePart.approved`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:781`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** User's decision to approve or deny the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalResponsePart.approved` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePart.reason`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:785`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional justification for the decision.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalResponsePart.reason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:794`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool approval response parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.approvalId`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:800`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** References the original approval request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.approvalId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.approved`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:804`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** User's decision to approve or deny the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.approved` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.reason`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:808`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional justification for the decision.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalResponsePartEncoded.reason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPart.approvalId`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:891`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this approval flow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalRequestPart.approvalId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPart.toolCallId`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:895`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool call ID requiring approval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalRequestPart.toolCallId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:904`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool approval request parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded.approvalId`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:910`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this approval flow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded.approvalId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded.toolCallId`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:914`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool call ID requiring approval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolApprovalRequestPartEncoded.toolCallId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BaseMessage`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1011`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface for all message types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.BaseMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BaseMessage.role`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1016`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The role of the message participant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BaseMessage.role` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BaseMessage.options`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1020`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Provider-specific options for this message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BaseMessage.options` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BaseMessageEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1029`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface for encoded message types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.BaseMessageEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BaseMessageEncoded.role`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1033`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The role of the message participant.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BaseMessageEncoded.role` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.BaseMessageEncoded.options`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1037`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Provider-specific options for this message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.BaseMessageEncoded.options` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.MessageConstructorParams`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1087`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type for specifying the parameters required to construct a specific message for a prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.MessageConstructorParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.MessageConstructorParams.options`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1091`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional provider-specific options for this message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.MessageConstructorParams.options` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.SystemMessage.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1154`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The system instruction or context as plain text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.SystemMessage.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.SystemMessageEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1163`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of system messages for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.SystemMessageEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.SystemMessageEncoded.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1167`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The system instruction or context as plain text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.SystemMessageEncoded.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessage.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1253`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of content parts that make up the user's message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.UserMessage.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessagePart (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1262`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of content parts allowed in user messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.UserMessagePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessageEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1270`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of user messages for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.UserMessageEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessageEncoded.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1274`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of content parts that make up the user's message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.UserMessageEncoded.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.UserMessagePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1283`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of encoded content parts for user messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.UserMessagePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessage.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1442`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of content parts that make up the assistant's response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.AssistantMessage.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessagePart (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1451`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of content parts allowed in assistant messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.AssistantMessagePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessageEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1465`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of assistant messages for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.AssistantMessageEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.AssistantMessagePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1475`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of encoded content parts for assistant messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.AssistantMessagePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessage.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1645`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of tool result parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolMessage.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessagePart (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1654`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of content parts allowed in tool messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolMessagePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessageEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1662`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool messages for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolMessageEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessageEncoded.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1666`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of tool result parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.ToolMessageEncoded.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.ToolMessagePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1675`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of encoded content parts for tool messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.ToolMessagePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Message (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1741`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A type representing all possible message types in a conversation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.Message`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.MessageEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1753`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A type representing all possible encoded message types for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.MessageEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Prompt (type)`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1793`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A Prompt contains a sequence of messages that form the context of a conversation with a large language model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.Prompt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.Prompt.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1798`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of messages that make up the conversation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.Prompt.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.PromptEncoded`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1807`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of prompts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Prompt.PromptEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Prompt.PromptEncoded.content`

- **Source:** `packages/effect/src/unstable/ai/Prompt.ts:1811`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of messages that make up the conversation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Prompt.PromptEncoded.content` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
