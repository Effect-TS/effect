# Example Suggestions: `effect/unstable/ai/Response`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Response.ts`
- **Uncovered API records:** 198
- **Priorities:** 0 required, 7 recommended, 191 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                       | Line | Kind               | Priority        |
| ------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/Response.isPart`                                      |   34 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.Part (value)`                                |  265 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.StreamPart (value)`                          |  357 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.ProviderMetadata (value)`                    |  433 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.ToolParamsStartPart (value)`                 | 1135 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.ToolParamsDeltaPart (value)`                 | 1213 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.ToolParamsEndPart (value)`                   | 1281 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Response.TextPartMetadata`                            |  602 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextPart`                                    |  610 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextStartPartMetadata`                       |  661 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextStartPart (value)`                       |  669 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPartMetadata`                       |  728 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPart (value)`                       |  736 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextEndPartMetadata`                         |  788 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextEndPart (value)`                         |  796 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningPartMetadata`                       |  860 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningPart`                               |  868 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningStartPartMetadata`                  |  919 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningStartPart (value)`                  |  927 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPartMetadata`                  |  986 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPart (value)`                  |  994 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningEndPartMetadata`                    | 1046 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningEndPart (value)`                    | 1054 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPartMetadata`                 | 1127 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPartMetadata`                 | 1205 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsEndPartMetadata`                   | 1273 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolCallPartMetadata`                        | 1383 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolCallPart`                                | 1391 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.toolCallPart`                                | 1425 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartMetadata`                      | 1597 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolResultPart`                              | 1605 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.toolResultPart`                              | 1704 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPartMetadata`             | 1786 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPart`                     | 1794 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.toolApprovalRequestPart`                     | 1818 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FilePartMetadata`                            | 1883 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FilePart`                                    | 1896 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartMetadata`                  | 1981 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart (value)`                  | 2003 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePartMetadata`                       | 2086 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePart (value)`                       | 2094 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPartMetadata`                | 2277 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPart`                        | 2285 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FinishPartMetadata`                          | 2490 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FinishPart`                                  | 2503 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ErrorPartMetadata`                           | 2571 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ErrorPart`                                   | 2589 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.AnyPart`                                     |   42 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.AnyPartEncoded`                              |   70 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.AllParts`                                    |   98 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.AllPartsEncoded`                             |  126 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.Part (type)`                                 |  227 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.PartEncoded`                                 |  245 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.StreamPart (type)`                           |  305 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.StreamPartEncoded`                           |  331 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolCallParts`                               |  405 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolResultParts`                             |  416 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ProviderMetadata (type)`                     |  445 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.BasePart`                                    |  454 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.BasePart.type`                               |  459 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BasePart.metadata`                           |  463 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BasePartEncoded`                             |  472 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.BasePartEncoded.type`                        |  476 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BasePartEncoded.metadata`                    |  480 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ConstructorParams`                           |  545 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ConstructorParams.metadata`                  |  551 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextPart.text`                               |  579 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextPartEncoded`                             |  588 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextPartEncoded.text`                        |  592 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextStartPart (type)`                        |  634 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextStartPart.id`                            |  638 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextStartPartEncoded`                        |  647 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextStartPartEncoded.id`                     |  651 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPart (type)`                        |  693 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPart.id`                            |  697 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPart.delta`                         |  701 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPartEncoded`                        |  710 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPartEncoded.id`                     |  714 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextDeltaPartEncoded.delta`                  |  718 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextEndPart (type)`                          |  761 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextEndPart.id`                              |  765 | `member`           | **optional**    |
| `effect/unstable/ai/Response.TextEndPartEncoded`                          |  774 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.TextEndPartEncoded.id`                       |  778 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningPart.text`                          |  837 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningPartEncoded`                        |  846 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningPartEncoded.text`                   |  850 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningStartPart (type)`                   |  892 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningStartPart.id`                       |  896 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningStartPartEncoded`                   |  905 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningStartPartEncoded.id`                |  909 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPart (type)`                   |  951 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPart.id`                       |  955 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPart.delta`                    |  959 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPartEncoded`                   |  968 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPartEncoded.id`                |  972 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningDeltaPartEncoded.delta`             |  976 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningEndPart (type)`                     | 1019 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningEndPart.id`                         | 1023 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ReasoningEndPartEncoded`                     | 1032 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ReasoningEndPartEncoded.id`                  | 1036 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPart (type)`                  | 1082 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPart.id`                      | 1086 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPart.name`                    | 1091 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPart.providerExecuted`        | 1095 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPartEncoded`                  | 1104 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPartEncoded.id`               | 1108 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPartEncoded.name`             | 1113 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsStartPartEncoded.providerExecuted` | 1117 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPart (type)`                  | 1170 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPart.id`                      | 1174 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPart.delta`                   | 1178 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded`                  | 1187 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded.id`               | 1191 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded.delta`            | 1195 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsEndPart (type)`                    | 1246 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsEndPart.id`                        | 1250 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolParamsEndPartEncoded`                    | 1259 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolParamsEndPartEncoded.id`                 | 1263 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPart.id`                             | 1334 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPart.name`                           | 1339 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPart.params`                         | 1343 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPart.providerExecuted`               | 1347 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPartEncoded`                         | 1356 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolCallPartEncoded.id`                      | 1360 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPartEncoded.name`                    | 1365 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPartEncoded.params`                  | 1369 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolCallPartEncoded.providerExecuted`        | 1373 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BaseToolResult`                              | 1439 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.BaseToolResult.id`                           | 1443 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BaseToolResult.name`                         | 1448 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BaseToolResult.encodedResult`                | 1452 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BaseToolResult.providerExecuted`             | 1456 | `member`           | **optional**    |
| `effect/unstable/ai/Response.BaseToolResult.preliminary`                  | 1470 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultSuccess`                           | 1479 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolResultSuccess.result`                    | 1483 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultSuccess.isFailure`                 | 1487 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultFailure`                           | 1496 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolResultFailure.result`                    | 1500 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultFailure.isFailure`                 | 1504 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded`                       | 1558 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded.id`                    | 1562 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded.name`                  | 1567 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded.result`                | 1571 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded.isFailure`             | 1575 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded.providerExecuted`      | 1579 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolResultPartEncoded.preliminary`           | 1587 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPart.approvalId`          | 1753 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPart.toolCallId`          | 1757 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded`              | 1766 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded.approvalId`   | 1772 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded.toolCallId`   | 1776 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FilePart.mediaType`                          | 1852 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FilePart.data`                               | 1856 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FilePartEncoded`                             | 1865 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FilePartEncoded.mediaType`                   | 1869 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FilePartEncoded.data`                        | 1873 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart (type)`                   | 1922 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart.sourceType`               | 1926 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart.id`                       | 1930 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart.mediaType`                | 1934 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart.title`                    | 1938 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePart.fileName`                 | 1942 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartEncoded`                   | 1951 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartEncoded.sourceType`        | 1955 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartEncoded.id`                | 1959 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartEncoded.mediaType`         | 1963 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartEncoded.title`             | 1967 | `member`           | **optional**    |
| `effect/unstable/ai/Response.DocumentSourcePartEncoded.fileName`          | 1971 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePart (type)`                        | 2035 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePart.sourceType`                    | 2039 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePart.id`                            | 2043 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePart.url`                           | 2047 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePart.title`                         | 2051 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePartEncoded`                        | 2060 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePartEncoded.sourceType`             | 2064 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePartEncoded.id`                     | 2068 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePartEncoded.url`                    | 2072 | `member`           | **optional**    |
| `effect/unstable/ai/Response.UrlSourcePartEncoded.title`                  | 2076 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPart.id`                     | 2228 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPart.modelId`                | 2232 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPart.timestamp`              | 2236 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPart.request`                | 2240 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPartEncoded`                 | 2249 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPartEncoded.id`              | 2255 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPartEncoded.modelId`         | 2259 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPartEncoded.timestamp`       | 2263 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ResponseMetadataPartEncoded.request`         | 2267 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FinishReason (type) (type)`                  | 2329 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FinishReason (type) (type)`                  | 2361 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.Usage`                                       | 2375 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FinishPart.reason`                           | 2451 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FinishPart.usage`                            | 2455 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FinishPart.response`                         | 2459 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FinishPartEncoded`                           | 2468 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Response.FinishPartEncoded.reason`                    | 2472 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FinishPartEncoded.usage`                     | 2476 | `member`           | **optional**    |
| `effect/unstable/ai/Response.FinishPartEncoded.response`                  | 2480 | `member`           | **optional**    |
| `effect/unstable/ai/Response.ErrorPartEncoded`                            | 2560 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/ai/Response.isPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:34`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is a Response Part.
- **Signature hint:** `declare function isPart(u: unknown): u is AnyPart`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.isPart`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Response.isPart` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Response.Part (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:265`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a Schema for non-streaming response parts based on a toolkit.
- **Signature hint:** `declare function Part<T extends Toolkit.Any | Toolkit.WithHandler<any>>(toolkit: T): Schema.Codec<Part<T extends Toolkit.Any ? Toolkit.Tools<T> : Toolkit.WithHandlerTools<T>>, PartEncoded, Tool.ResultDecodingServices<Toolkit.Tools<T>[keyof Toolkit.Tools<T>]>, Tool.ResultEncodingServices<Toolkit.Tools<T>[keyof Toolkit.Tools<T>]>>`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.Part`.
- **Suggested snippet:** Define the smallest domain Schema involving `Response.Part`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Response.StreamPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:357`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a Schema for streaming response parts based on a toolkit.
- **Signature hint:** `declare function StreamPart<T extends Toolkit.Any | Toolkit.WithHandler<any>>(toolkit: T): Schema.Codec<StreamPart<T extends Toolkit.Any ? Toolkit.Tools<T> : Toolkit.WithHandlerTools<T>>, StreamPartEncoded, Tool.ResultDecodingServices<Toolkit.Tools<T>[keyof Toolkit.Tools<T>]>, Tool.ResultEncodingServices<Toolkit.Tools<T>[keyof Toolkit.Tools<T>]>>`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.StreamPart`.
- **Suggested snippet:** Define the smallest domain Schema involving `Response.StreamPart`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Response.ProviderMetadata (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:433`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for provider-specific metadata attached to response parts, represented as a record from provider-specific keys to JSON values or `null`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ProviderMetadata`.
- **Suggested snippet:** Use `Response.ProviderMetadata` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Response.ToolParamsStartPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1135`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of tool params start parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ToolParamsStartPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.ToolParamsStartPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Response.ToolParamsDeltaPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1213`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of tool params delta parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ToolParamsDeltaPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.ToolParamsDeltaPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/Response.ToolParamsEndPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1281`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validation and encoding of tool params end parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ToolParamsEndPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.ToolParamsEndPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/Response.TextPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:602`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `TextPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:610`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of text parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.TextPart`.
- **Suggested snippet:** Use `Response.TextPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextStartPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:661`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `TextStartPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextStartPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextStartPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:669`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of text start parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.TextStartPart`.
- **Suggested snippet:** Use `Response.TextStartPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:728`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `TextDeltaPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextDeltaPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:736`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of text delta parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.TextDeltaPart`.
- **Suggested snippet:** Use `Response.TextDeltaPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextEndPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:788`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `TextEndPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextEndPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextEndPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:796`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of text end parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.TextEndPart`.
- **Suggested snippet:** Use `Response.TextEndPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:860`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ReasoningPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:868`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of reasoning parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ReasoningPart`.
- **Suggested snippet:** Use `Response.ReasoningPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningStartPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:919`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ReasoningStartPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningStartPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningStartPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:927`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of reasoning start parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ReasoningStartPart`.
- **Suggested snippet:** Use `Response.ReasoningStartPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:986`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ReasoningDeltaPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningDeltaPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:994`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of reasoning delta parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ReasoningDeltaPart`.
- **Suggested snippet:** Use `Response.ReasoningDeltaPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningEndPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1046`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ReasoningEndPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningEndPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningEndPart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1054`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of reasoning end parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ReasoningEndPart`.
- **Suggested snippet:** Use `Response.ReasoningEndPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1127`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ToolParamsStartPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsStartPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1205`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ToolParamsDeltaPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsDeltaPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsEndPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1273`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ToolParamsEndPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsEndPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1383`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ToolCallPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolCallPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1391`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates a Schema for tool call parts with specific tool name and parameters.
- **Signature hint:** `declare function ToolCallPart<const Name extends string, Params extends Schema.Constraint>(name: Name, params: Params): Schema.Struct<{ readonly type: Schema.Literal<'tool-call'>; readonly id: Schema.String; readonly name: Schema.Literal<Name>; readonly params: Params; readonly providerExecuted: Schema.withDecodingDefaultKey<Schema.Boolean>; readonly '~effect/ai/Content/Part': Schema.withDecodingDefaultKey<Schema.tag<'~effect/ai/Content/Part'>>; readonly metadata: Schema.withDecodingDefault<Schema.$Record<Schema.String, Schema.Codec<Schema.Json>>>; }>`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ToolCallPart`.
- **Suggested snippet:** Define the smallest domain Schema involving `Response.ToolCallPart`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.toolCallPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1425`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool call part.
- **Signature hint:** `declare function toolCallPart<const Name extends string, Params>(params: ConstructorParams<ToolCallPart<Name, Params>>): ToolCallPart<Name, Params>`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.toolCallPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.toolCallPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1597`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ToolResultPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolResultPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1605`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates a Schema for tool result parts with specific tool name and result type.
- **Signature hint:** `declare function ToolResultPart<const Name extends string, Success extends Schema.Constraint, Failure extends Schema.Constraint>(name: Name, success: Success, failure: Failure): Schema.decodeTo<Schema.Struct<{ readonly '~effect/ai/Content/Part': Schema.Literal<'~effect/ai/Content/Part'>; readonly result: Schema.Union<readonly [Success, Failure]>; readonly providerExecuted: Schema.Boolean; readonly metadata: Schema.$Record<Schema.String, Schema.NullOr<Schema.Codec<Schema.Json>>>; readonly encodedResult: Schema.toEncoded<Schema.Union<readonly [Success, Failure]>>; readonly preliminary: Schema.Boolean; readonly id: Schema.String; readonly type: Schema.Literal<'tool-result'>; readonly isFailure: Schema.Boolean; readonly name: Schema.Literal<Name>; }>, Schema.Struct<{ readonly result: Schema.toEncoded<Schema.Union<readonly [Success, Failure]>>; readonly providerExecuted: Schema.optional<Schema.Boolean>; readonly metadata: Schema.optional<Schema.$Record<Schema.String, Schema.NullOr<Schema.Codec<Schema.Json>>>>; readonly preliminary: Schema.optional<Schema.Boolean>; readonly id: Schema.String; readonly type: Schema.Literal<'tool-result'>; readonly isFailure: Schema.Boolean; readonly name: Schema.Literal<Name>; }>>`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ToolResultPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.ToolResultPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.toolResultPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1704`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool result part.
- **Signature hint:** `declare function toolResultPart<const Params extends ConstructorParams<ToolResultPart<string, unknown, unknown>>>(params: Params): Params extends { readonly name: infer Name extends string; readonly isFailure: false; readonly result: infer Success; } ? ToolResultPart<Name, Success, never> : Params extends { readonly name: infer Name extends string; readonly isFailure: true; readonly result: infer Failure; } ? ToolResultPart<Name, never, Failure> : never`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.toolResultPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.toolResultPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1786`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ToolApprovalRequestPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolApprovalRequestPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1794`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of tool approval request parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ToolApprovalRequestPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.ToolApprovalRequestPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.toolApprovalRequestPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1818`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a new tool approval request part.
- **Signature hint:** `declare function toolApprovalRequestPart(params: ConstructorParams<ToolApprovalRequestPart>): ToolApprovalRequestPart`
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.toolApprovalRequestPart`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Response.toolApprovalRequestPart`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1883`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `FilePart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.FilePartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1896`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of file parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.FilePart`.
- **Suggested snippet:** Use `Response.FilePart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1981`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `DocumentSourcePart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.DocumentSourcePartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2003`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of document source parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.DocumentSourcePart`.
- **Suggested snippet:** Use `Response.DocumentSourcePart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2086`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `UrlSourcePart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.UrlSourcePartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePart (value)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2094`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of url source parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.UrlSourcePart`.
- **Suggested snippet:** Use `Response.UrlSourcePart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2277`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ResponseMetadataPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ResponseMetadataPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2285`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of response metadata parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ResponseMetadataPart`.
- **Suggested snippet:** Use `Response.ResponseMetadataPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2490`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `FinishPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.FinishPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2503`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for finish response parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.FinishPart`.
- **Suggested snippet:** Use `Response.FinishPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ErrorPartMetadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2571`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Represents provider-specific metadata that can be associated with a `ErrorPart` through module augmentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ErrorPartMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ErrorPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2589`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for validation and encoding of error parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.ErrorPart`.
- **Suggested snippet:** Use `Response.ErrorPart` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.AnyPart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type representing all possible response content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.AnyPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.AnyPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:70`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of all possible response content parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.AnyPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.AllParts`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:98`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type for all response parts with tool-specific typing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.AllParts`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.AllPartsEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:126`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of all response parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.AllPartsEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.Part (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:227`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A type for representing non-streaming response parts with tool-specific typing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.Part`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.PartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:245`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of non-streaming response parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.PartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.StreamPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:305`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A type for representing streaming response parts with tool-specific typing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.StreamPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.StreamPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:331`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of streaming response parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.StreamPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallParts`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:405`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Utility type that extracts tool call parts from a set of tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolCallParts`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultParts`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:416`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Utility type that extracts tool result parts from a set of tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolResultParts`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ProviderMetadata (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:445`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of provider-specific metadata attached to response parts, keyed by provider-specific names with JSON or `null` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ProviderMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BasePart`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:454`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface for all response content parts, including the type identifier and optional metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.BasePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BasePart.type`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:459`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The type of this response part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BasePart.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BasePart.metadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:463`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional provider-specific metadata for this part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BasePart.metadata` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BasePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:472`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base interface for encoded response content parts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.BasePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BasePartEncoded.type`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:476`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The type of this response part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BasePartEncoded.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BasePartEncoded.metadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:480`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional provider-specific metadata for this part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BasePartEncoded.metadata` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ConstructorParams`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:545`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type for specifying the parameters required to construct a specific response part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ConstructorParams`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ConstructorParams.metadata`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:551`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional provider-specific metadata for this part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ConstructorParams.metadata` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextPart.text`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:579`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextPart.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:588`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of text parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextPartEncoded.text`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:592`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextPartEncoded.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextStartPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:634`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part indicating the start of streaming text content with a unique text chunk identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextStartPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextStartPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:638`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextStartPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextStartPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:647`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of text start parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextStartPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextStartPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:651`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextStartPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:693`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part containing incremental text content to be added to the existing text chunk with the same unique identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextDeltaPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:697`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextDeltaPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPart.delta`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:701`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The incremental text content to add.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextDeltaPart.delta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:710`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of text delta parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextDeltaPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:714`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextDeltaPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextDeltaPartEncoded.delta`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:718`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The incremental text content to add.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextDeltaPartEncoded.delta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextEndPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:761`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part indicating the completion of a streaming text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextEndPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextEndPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:765`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextEndPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextEndPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:774`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of text end parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.TextEndPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.TextEndPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:778`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding text chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.TextEndPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningPart.text`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:837`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reasoning or thought process text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningPart.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:846`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of reasoning parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningPartEncoded.text`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:850`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reasoning or thought process text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningPartEncoded.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningStartPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:892`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part indicating the start of streaming reasoning content with a unique reasoning chunk identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningStartPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningStartPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:896`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this reasoning chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningStartPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningStartPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:905`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of reasoning start parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningStartPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningStartPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:909`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this reasoning stream.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningStartPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:951`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part containing incremental reasoning content to be added to the existing chunk of reasoning text with the same unique identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningDeltaPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:955`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding reasoning chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningDeltaPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPart.delta`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:959`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The incremental reasoning content to add.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningDeltaPart.delta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:968`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of reasoning delta parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningDeltaPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:972`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding reasoning chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningDeltaPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningDeltaPartEncoded.delta`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:976`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The incremental reasoning content to add.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningDeltaPartEncoded.delta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningEndPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1019`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part indicating the completion of a streaming reasoning chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningEndPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningEndPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1023`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding reasoning chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningEndPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningEndPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1032`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of reasoning end parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ReasoningEndPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ReasoningEndPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1036`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding reasoning chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ReasoningEndPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1082`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part indicating the start of streaming tool parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsStartPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1086`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this tool parameter chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsStartPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPart.name`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1091`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool being called, which corresponds to the name of the tool in the `Toolkit` included with the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsStartPart.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPart.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1095`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsStartPart.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1104`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool params start parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsStartPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1108`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this tool parameter chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsStartPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPartEncoded.name`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1113`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool being called, which corresponds to the name of the tool in the `Toolkit` included with the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsStartPartEncoded.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsStartPartEncoded.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1117`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsStartPartEncoded.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1170`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part containing incremental tool parameter content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsDeltaPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1174`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding tool parameter chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsDeltaPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPart.delta`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1178`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The incremental parameter content (typically JSON fragment) to add.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsDeltaPart.delta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1187`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool params delta parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1191`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding tool parameter chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded.delta`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1195`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The incremental parameter content (typically JSON fragment) to add.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsDeltaPartEncoded.delta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsEndPart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1246`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part indicating the end of streaming tool parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsEndPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsEndPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1250`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding tool parameter chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsEndPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsEndPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1259`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool params end parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolParamsEndPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolParamsEndPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1263`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the corresponding tool parameter stream.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolParamsEndPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1334`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPart.name`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1339`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool being called, which corresponds to the name of the tool in the `Toolkit` included with the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPart.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPart.params`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1343`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Parameters to pass to the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPart.params` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPart.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1347`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPart.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1356`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool call parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolCallPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1360`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPartEncoded.name`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1365`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool being called, which corresponds to the name of the tool in the `Toolkit` included with the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPartEncoded.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPartEncoded.params`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1369`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Parameters to pass to the tool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPartEncoded.params` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolCallPartEncoded.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1373`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolCallPartEncoded.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BaseToolResult`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1439`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The base fields of a tool result part.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.BaseToolResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BaseToolResult.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1443`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the original tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BaseToolResult.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BaseToolResult.name`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1448`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool being called, which corresponds to the name of the tool in the `Toolkit` included with the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BaseToolResult.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BaseToolResult.encodedResult`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1452`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The encoded result for serialization purposes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BaseToolResult.encodedResult` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BaseToolResult.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1456`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BaseToolResult.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.BaseToolResult.preliminary`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1470`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this is a preliminary (intermediate) result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.BaseToolResult.preliminary` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultSuccess`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1479`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a successful tool call result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolResultSuccess`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultSuccess.result`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1483`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The decoded success returned by the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultSuccess.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultSuccess.isFailure`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1487`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not the result of executing the tool call handler was an error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultSuccess.isFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultFailure`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1496`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a failed tool call result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolResultFailure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultFailure.result`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1500`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The decoded failure returned by the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultFailure.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultFailure.isFailure`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1504`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not the result of executing the tool call handler was an error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultFailure.isFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1558`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool result parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolResultPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1562`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier matching the original tool call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded.name`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1567`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Name of the tool being called, which corresponds to the name of the tool in the `Toolkit` included with the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultPartEncoded.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded.result`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1571`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The result returned by the tool execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultPartEncoded.result` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded.isFailure`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1575`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not the result of executing the tool call handler was an error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultPartEncoded.isFailure` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded.providerExecuted`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1579`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether the tool was executed by the provider (true) or framework (false).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultPartEncoded.providerExecuted` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolResultPartEncoded.preliminary`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1587`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this is a preliminary (intermediate) result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolResultPartEncoded.preliminary` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPart.approvalId`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1753`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this approval flow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolApprovalRequestPart.approvalId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPart.toolCallId`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1757`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool call ID requiring approval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolApprovalRequestPart.toolCallId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1766`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of tool approval request parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded.approvalId`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1772`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for this approval flow.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded.approvalId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded.toolCallId`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1776`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool call ID requiring approval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ToolApprovalRequestPartEncoded.toolCallId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePart.mediaType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1852`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MIME type of the file (e.g., "image/jpeg", "application/pdf").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FilePart.mediaType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePart.data`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1856`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** File data as a byte array.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FilePart.data` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1865`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of file parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.FilePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePartEncoded.mediaType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1869`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MIME type of the file (e.g., "image/jpeg", "application/pdf").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FilePartEncoded.mediaType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FilePartEncoded.data`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1873`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** File data as a base64 string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FilePartEncoded.data` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1922`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part representing a document source reference used in generating the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.DocumentSourcePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart.sourceType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1926`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Type discriminator for document sources.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePart.sourceType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1930`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart.mediaType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1934`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MIME type of the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePart.mediaType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart.title`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1938`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Display title of the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePart.title` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePart.fileName`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1942`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional filename of the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePart.fileName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1951`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of document source parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.DocumentSourcePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartEncoded.sourceType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1955`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Type discriminator for document sources.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePartEncoded.sourceType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1959`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartEncoded.mediaType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1963`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MIME type of the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePartEncoded.mediaType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartEncoded.title`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1967`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Display title of the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePartEncoded.title` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.DocumentSourcePartEncoded.fileName`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:1971`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional filename of the document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.DocumentSourcePartEncoded.fileName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePart (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2035`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response part representing a URL source reference used in generating the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.UrlSourcePart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePart.sourceType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2039`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Type discriminator for URL sources.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePart.sourceType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2043`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for the URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePart.url`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2047`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The URL that was referenced.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePart.url` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePart.title`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2051`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Display title of the URL content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePart.title` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2060`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of URL source parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.UrlSourcePartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePartEncoded.sourceType`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2064`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Type discriminator for URL sources.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePartEncoded.sourceType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2068`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unique identifier for the URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePartEncoded.url`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2072`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The URL that was referenced as a string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePartEncoded.url` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.UrlSourcePartEncoded.title`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2076`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Display title of the URL content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.UrlSourcePartEncoded.title` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPart.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2228`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional unique identifier for this specific response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPart.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPart.modelId`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2232`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional identifier of the AI model that generated the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPart.modelId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPart.timestamp`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2236`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional timestamp when the response was generated.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPart.timestamp` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPart.request`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2240`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional HTTP request details for the request made to the AI provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPart.request` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2249`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of response metadata parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ResponseMetadataPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPartEncoded.id`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2255`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional unique identifier for this specific response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPartEncoded.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPartEncoded.modelId`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2259`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional identifier of the AI model that generated the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPartEncoded.modelId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPartEncoded.timestamp`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2263`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional timestamp when the response was generated.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPartEncoded.timestamp` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ResponseMetadataPartEncoded.request`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2267`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional HTTP request details for the request made to the AI provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.ResponseMetadataPartEncoded.request` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishReason (type) (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2329`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the reason why a model finished generation of a response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.FinishReason`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Response.FinishReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishReason (type) (type)`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2361`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of the reason why a model stopped generating a response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.FinishReason (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.Usage`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2375`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents usage information for a request to a large language model provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Response } from "effect/unstable/ai"` and use `Response.Usage`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Response.Usage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPart.reason`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2451`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reason why the model finished generating the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FinishPart.reason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPart.usage`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2455`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Token usage statistics for the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FinishPart.usage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPart.response`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2459`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional HTTP response details from the AI provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FinishPart.response` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2468`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of finish parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.FinishPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPartEncoded.reason`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2472`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reason why the model finished generating the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FinishPartEncoded.reason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPartEncoded.usage`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2476`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Token usage statistics for the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FinishPartEncoded.usage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.FinishPartEncoded.response`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2480`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional HTTP response details from the AI provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Response.FinishPartEncoded.response` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Response.ErrorPartEncoded`

- **Source:** `packages/effect/src/unstable/ai/Response.ts:2560`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoded representation of error parts for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Response.ErrorPartEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
