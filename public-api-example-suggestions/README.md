# Public API Example Suggestions

This directory is a handoff inventory for future documentation agents. It covers public API records and owned exports that currently have no declaration-level example. It does not require an example for every entry: priorities are heuristic starting points, and the advice fields preserve the repository's selective-coverage policy.

## Totals

- Source modules with uncovered exports: **499**
- Uncovered API/export suggestions: **6404**
- Required: **37**
- Recommended: **1728**
- Optional: **4266**
- Discouraged: **373**
- API records absent from the compliant model but included syntactically: **68**

The inventory includes normal extractor records, the private API-diff tool exports, the Atom Vue and Vitest implementation-bearing indexes, and `@effect/ai-docgen/Glob`. Generated and re-export-only barrels remain excluded. An existing plain TypeScript fence counts as coverage for this inventory even when it still needs migration to the runnable JSDoc format.

## Workflow

1. Choose a module and start with required or recommended entries.
2. Read the source declaration and implementation at the recorded line.
3. Inspect targeted tests, typetests, production call sites, sibling APIs, `@see` links, and module-level examples.
4. Reject or downgrade scenarios that repository evidence does not support.
5. Prefer one family anchor over near-identical examples; large modules intentionally cap repetitive recommended families.
6. Implement the smallest useful example, normally one primary behavior and at most one meaningful contrast.
7. Run `pnpm doctest --run <changed source files>`, package-local `pnpm docgen`, targeted Oxlint/dprint checks, and the repository-required final checks.

## Interpretation

- **Required:** lifecycle, resource safety, important failure semantics, or test registration is otherwise unclear.
- **Recommended:** one concise example materially improves understanding of semantic data, effects, schemas, composition, or narrowing.
- **Optional:** add only when tests or real call sites provide a useful distinction; omission is acceptable.
- **Discouraged:** prefer prose or `@see`; standalone examples would usually restate metadata, encourage unsafe use, or duplicate family coverage.

## Package Index

<details>
<summary><code>@effect/ai-anthropic</code> (6 modules)</summary>

| Source module                                                                                                  | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/ai/anthropic/src/AnthropicClient.ts`](./packages/ai/anthropic/src/AnthropicClient.md)               |          15 |        0 |           4 |       11 |           0 |
| [`packages/ai/anthropic/src/AnthropicConfig.ts`](./packages/ai/anthropic/src/AnthropicConfig.md)               |           5 |        0 |           2 |        3 |           0 |
| [`packages/ai/anthropic/src/AnthropicError.ts`](./packages/ai/anthropic/src/AnthropicError.md)                 |          10 |        0 |           0 |       10 |           0 |
| [`packages/ai/anthropic/src/AnthropicLanguageModel.ts`](./packages/ai/anthropic/src/AnthropicLanguageModel.md) |           8 |        0 |           5 |        3 |           0 |
| [`packages/ai/anthropic/src/AnthropicTelemetry.ts`](./packages/ai/anthropic/src/AnthropicTelemetry.md)         |          11 |        0 |           0 |       11 |           0 |
| [`packages/ai/anthropic/src/AnthropicTool.ts`](./packages/ai/anthropic/src/AnthropicTool.md)                   |         108 |        0 |          25 |       83 |           0 |

</details>

<details>
<summary><code>@effect/ai-codegen</code> (6 modules)</summary>

| Source module                                                                                    | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/ai-codegen/src/Config.ts`](./packages/tools/ai-codegen/src/Config.md)           |          14 |        0 |           0 |       14 |           0 |
| [`packages/tools/ai-codegen/src/Discovery.ts`](./packages/tools/ai-codegen/src/Discovery.md)     |           3 |        0 |           2 |        1 |           0 |
| [`packages/tools/ai-codegen/src/Generator.ts`](./packages/tools/ai-codegen/src/Generator.md)     |           5 |        0 |           4 |        1 |           0 |
| [`packages/tools/ai-codegen/src/Glob.ts`](./packages/tools/ai-codegen/src/Glob.md)               |           4 |        0 |           3 |        1 |           0 |
| [`packages/tools/ai-codegen/src/PostProcess.ts`](./packages/tools/ai-codegen/src/PostProcess.md) |           3 |        0 |           2 |        1 |           0 |
| [`packages/tools/ai-codegen/src/SpecFetcher.ts`](./packages/tools/ai-codegen/src/SpecFetcher.md) |           3 |        0 |           2 |        1 |           0 |

</details>

<details>
<summary><code>@effect/ai-docgen</code> (1 modules)</summary>

| Source module                                                                    | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/ai-docgen/src/Glob.ts`](./packages/tools/ai-docgen/src/Glob.md) |           3 |        0 |           3 |        0 |           0 |

</details>

<details>
<summary><code>@effect/ai-openai</code> (8 modules)</summary>

| Source module                                                                                        | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/ai/openai/src/OpenAiClient.ts`](./packages/ai/openai/src/OpenAiClient.md)                 |          19 |        0 |           7 |       12 |           0 |
| [`packages/ai/openai/src/OpenAiConfig.ts`](./packages/ai/openai/src/OpenAiConfig.md)                 |           5 |        0 |           2 |        3 |           0 |
| [`packages/ai/openai/src/OpenAiEmbeddingModel.ts`](./packages/ai/openai/src/OpenAiEmbeddingModel.md) |           6 |        0 |           5 |        1 |           0 |
| [`packages/ai/openai/src/OpenAiError.ts`](./packages/ai/openai/src/OpenAiError.md)                   |           9 |        0 |           0 |        9 |           0 |
| [`packages/ai/openai/src/OpenAiLanguageModel.ts`](./packages/ai/openai/src/OpenAiLanguageModel.md)   |           6 |        0 |           5 |        1 |           0 |
| [`packages/ai/openai/src/OpenAiSchema.ts`](./packages/ai/openai/src/OpenAiSchema.md)                 |          35 |        0 |           5 |       30 |           0 |
| [`packages/ai/openai/src/OpenAiTelemetry.ts`](./packages/ai/openai/src/OpenAiTelemetry.md)           |          12 |        0 |           0 |       12 |           0 |
| [`packages/ai/openai/src/OpenAiTool.ts`](./packages/ai/openai/src/OpenAiTool.md)                     |          10 |        0 |           9 |        1 |           0 |

</details>

<details>
<summary><code>@effect/ai-openai-compat</code> (6 modules)</summary>

| Source module                                                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/ai/openai-compat/src/OpenAiClient.ts`](./packages/ai/openai-compat/src/OpenAiClient.md)                 |          42 |        0 |           4 |       38 |           0 |
| [`packages/ai/openai-compat/src/OpenAiConfig.ts`](./packages/ai/openai-compat/src/OpenAiConfig.md)                 |           5 |        0 |           2 |        3 |           0 |
| [`packages/ai/openai-compat/src/OpenAiEmbeddingModel.ts`](./packages/ai/openai-compat/src/OpenAiEmbeddingModel.md) |           6 |        0 |           4 |        2 |           0 |
| [`packages/ai/openai-compat/src/OpenAiError.ts`](./packages/ai/openai-compat/src/OpenAiError.md)                   |           9 |        0 |           0 |        9 |           0 |
| [`packages/ai/openai-compat/src/OpenAiLanguageModel.ts`](./packages/ai/openai-compat/src/OpenAiLanguageModel.md)   |           5 |        0 |           5 |        0 |           0 |
| [`packages/ai/openai-compat/src/OpenAiTelemetry.ts`](./packages/ai/openai-compat/src/OpenAiTelemetry.md)           |          12 |        0 |           0 |       12 |           0 |

</details>

<details>
<summary><code>@effect/ai-openrouter</code> (4 modules)</summary>

| Source module                                                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/ai/openrouter/src/OpenRouterClient.ts`](./packages/ai/openrouter/src/OpenRouterClient.md)               |          10 |        0 |           4 |        6 |           0 |
| [`packages/ai/openrouter/src/OpenRouterConfig.ts`](./packages/ai/openrouter/src/OpenRouterConfig.md)               |           5 |        0 |           2 |        3 |           0 |
| [`packages/ai/openrouter/src/OpenRouterError.ts`](./packages/ai/openrouter/src/OpenRouterError.md)                 |           5 |        0 |           0 |        5 |           0 |
| [`packages/ai/openrouter/src/OpenRouterLanguageModel.ts`](./packages/ai/openrouter/src/OpenRouterLanguageModel.md) |           7 |        0 |           5 |        2 |           0 |

</details>

<details>
<summary><code>@effect/api-diff</code> (12 modules)</summary>

| Source module                                                                                  | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/api-diff/src/Annotations.ts`](./packages/tools/api-diff/src/Annotations.md)   |           2 |        0 |           1 |        1 |           0 |
| [`packages/tools/api-diff/src/ApiDiff.ts`](./packages/tools/api-diff/src/ApiDiff.md)           |           2 |        0 |           1 |        1 |           0 |
| [`packages/tools/api-diff/src/Cli.ts`](./packages/tools/api-diff/src/Cli.md)                   |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/api-diff/src/Diff.ts`](./packages/tools/api-diff/src/Diff.md)                 |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/api-diff/src/Discovery.ts`](./packages/tools/api-diff/src/Discovery.md)       |           2 |        0 |           1 |        1 |           0 |
| [`packages/tools/api-diff/src/Error.ts`](./packages/tools/api-diff/src/Error.md)               |           1 |        0 |           1 |        0 |           0 |
| [`packages/tools/api-diff/src/Json.ts`](./packages/tools/api-diff/src/Json.md)                 |           4 |        0 |           1 |        3 |           0 |
| [`packages/tools/api-diff/src/MigrationDoc.ts`](./packages/tools/api-diff/src/MigrationDoc.md) |           6 |        0 |           0 |        6 |           0 |
| [`packages/tools/api-diff/src/Model.ts`](./packages/tools/api-diff/src/Model.md)               |          15 |        0 |           3 |       12 |           0 |
| [`packages/tools/api-diff/src/Report.ts`](./packages/tools/api-diff/src/Report.md)             |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/api-diff/src/Snapshot.ts`](./packages/tools/api-diff/src/Snapshot.md)         |           5 |        0 |           2 |        3 |           0 |
| [`packages/tools/api-diff/src/Worktrees.ts`](./packages/tools/api-diff/src/Worktrees.md)       |           2 |        0 |           1 |        1 |           0 |

</details>

<details>
<summary><code>@effect/atom-react</code> (4 modules)</summary>

| Source module                                                                                | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/atom/react/src/Hooks.ts`](./packages/atom/react/src/Hooks.md)                     |          11 |        0 |           3 |        8 |           0 |
| [`packages/atom/react/src/ReactHydration.ts`](./packages/atom/react/src/ReactHydration.md)   |           2 |        0 |           0 |        2 |           0 |
| [`packages/atom/react/src/RegistryContext.ts`](./packages/atom/react/src/RegistryContext.md) |           3 |        0 |           0 |        3 |           0 |
| [`packages/atom/react/src/ScopedAtom.ts`](./packages/atom/react/src/ScopedAtom.md)           |           2 |        0 |           0 |        0 |           2 |

</details>

<details>
<summary><code>@effect/atom-solid</code> (2 modules)</summary>

| Source module                                                                                | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/atom/solid/src/Hooks.ts`](./packages/atom/solid/src/Hooks.md)                     |          11 |        0 |           2 |        9 |           0 |
| [`packages/atom/solid/src/RegistryContext.ts`](./packages/atom/solid/src/RegistryContext.md) |           2 |        0 |           0 |        2 |           0 |

</details>

<details>
<summary><code>@effect/atom-vue</code> (1 modules)</summary>

| Source module                                                        | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/atom/vue/src/index.ts`](./packages/atom/vue/src/index.md) |           7 |        0 |           2 |        5 |           0 |

</details>

<details>
<summary><code>@effect/bundle</code> (5 modules)</summary>

| Source module                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/bundle/src/Cli.ts`](./packages/tools/bundle/src/Cli.md)           |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/bundle/src/Fixtures.ts`](./packages/tools/bundle/src/Fixtures.md) |           1 |        0 |           1 |        0 |           0 |
| [`packages/tools/bundle/src/Plugins.ts`](./packages/tools/bundle/src/Plugins.md)   |           4 |        0 |           1 |        3 |           0 |
| [`packages/tools/bundle/src/Reporter.ts`](./packages/tools/bundle/src/Reporter.md) |           6 |        0 |           2 |        4 |           0 |
| [`packages/tools/bundle/src/Rollup.ts`](./packages/tools/bundle/src/Rollup.md)     |           5 |        0 |           2 |        3 |           0 |

</details>

<details>
<summary><code>@effect/docgen</code> (7 modules)</summary>

| Source module                                                                                | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/docgen/src/Checker.ts`](./packages/tools/docgen/src/Checker.md)             |           9 |        0 |           9 |        0 |           0 |
| [`packages/tools/docgen/src/CLI.ts`](./packages/tools/docgen/src/CLI.md)                     |           1 |        0 |           1 |        0 |           0 |
| [`packages/tools/docgen/src/Configuration.ts`](./packages/tools/docgen/src/Configuration.md) |           4 |        0 |           2 |        2 |           0 |
| [`packages/tools/docgen/src/Core.ts`](./packages/tools/docgen/src/Core.md)                   |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/docgen/src/Domain.ts`](./packages/tools/docgen/src/Domain.md)               |          17 |        0 |           1 |       14 |           2 |
| [`packages/tools/docgen/src/Parser.ts`](./packages/tools/docgen/src/Parser.md)               |          10 |        0 |           1 |        9 |           0 |
| [`packages/tools/docgen/src/Printer.ts`](./packages/tools/docgen/src/Printer.md)             |           3 |        0 |           2 |        1 |           0 |

</details>

<details>
<summary><code>@effect/doctest</code> (6 modules)</summary>

| Source module                                                                          | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/doctest/src/Plugin.ts`](./packages/tools/doctest/src/Plugin.md)       |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/doctest/src/Protocol.ts`](./packages/tools/doctest/src/Protocol.md)   |           9 |        0 |           0 |        4 |           5 |
| [`packages/tools/doctest/src/Runner.ts`](./packages/tools/doctest/src/Runner.md)       |           1 |        0 |           0 |        1 |           0 |
| [`packages/tools/doctest/src/Runtime.ts`](./packages/tools/doctest/src/Runtime.md)     |           2 |        0 |           1 |        1 |           0 |
| [`packages/tools/doctest/src/Source.ts`](./packages/tools/doctest/src/Source.md)       |           4 |        0 |           0 |        4 |           0 |
| [`packages/tools/doctest/src/Transform.ts`](./packages/tools/doctest/src/Transform.md) |           1 |        0 |           0 |        1 |           0 |

</details>

<details>
<summary><code>@effect/jsdocs</code> (1 modules)</summary>

| Source module                                                                  | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/jsdocs/src/Jsdocs.ts`](./packages/tools/jsdocs/src/Jsdocs.md) |          44 |        0 |           3 |       41 |           0 |

</details>

<details>
<summary><code>@effect/openapi-generator</code> (7 modules)</summary>

| Source module                                                                                                                  | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/openapi-generator/src/HttpApiTransformer.ts`](./packages/tools/openapi-generator/src/HttpApiTransformer.md)   |           2 |        0 |           1 |        1 |           0 |
| [`packages/tools/openapi-generator/src/JsonSchemaGenerator.ts`](./packages/tools/openapi-generator/src/JsonSchemaGenerator.md) |           1 |        0 |           1 |        0 |           0 |
| [`packages/tools/openapi-generator/src/OpenApiGenerator.ts`](./packages/tools/openapi-generator/src/OpenApiGenerator.md)       |          12 |        0 |           4 |        8 |           0 |
| [`packages/tools/openapi-generator/src/OpenApiPatch.ts`](./packages/tools/openapi-generator/src/OpenApiPatch.md)               |           5 |        0 |           3 |        2 |           0 |
| [`packages/tools/openapi-generator/src/OpenApiTransformer.ts`](./packages/tools/openapi-generator/src/OpenApiTransformer.md)   |           5 |        0 |           4 |        1 |           0 |
| [`packages/tools/openapi-generator/src/ParsedOperation.ts`](./packages/tools/openapi-generator/src/ParsedOperation.md)         |          13 |        0 |           0 |       13 |           0 |
| [`packages/tools/openapi-generator/src/Utils.ts`](./packages/tools/openapi-generator/src/Utils.md)                             |           5 |        0 |           0 |        5 |           0 |

</details>

<details>
<summary><code>@effect/opentelemetry</code> (6 modules)</summary>

| Source module                                                                              | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/opentelemetry/src/NodeSdk.ts`](./packages/opentelemetry/src/NodeSdk.md)         |           4 |        0 |           3 |        1 |           0 |
| [`packages/opentelemetry/src/OtelLogger.ts`](./packages/opentelemetry/src/OtelLogger.md)   |           5 |        0 |           5 |        0 |           0 |
| [`packages/opentelemetry/src/OtelMetrics.ts`](./packages/opentelemetry/src/OtelMetrics.md) |           3 |        0 |           2 |        1 |           0 |
| [`packages/opentelemetry/src/OtelTracer.ts`](./packages/opentelemetry/src/OtelTracer.md)   |          14 |        0 |          13 |        1 |           0 |
| [`packages/opentelemetry/src/Resource.ts`](./packages/opentelemetry/src/Resource.md)       |           5 |        0 |           5 |        0 |           0 |
| [`packages/opentelemetry/src/WebSdk.ts`](./packages/opentelemetry/src/WebSdk.md)           |           3 |        0 |           2 |        1 |           0 |

</details>

<details>
<summary><code>@effect/platform-browser</code> (17 modules)</summary>

| Source module                                                                                                        | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/platform-browser/src/BrowserCrypto.ts`](./packages/platform-browser/src/BrowserCrypto.md)                 |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-browser/src/BrowserHttpClient.ts`](./packages/platform-browser/src/BrowserHttpClient.md)         |           8 |        0 |           5 |        3 |           0 |
| [`packages/platform-browser/src/BrowserKeyValueStore.ts`](./packages/platform-browser/src/BrowserKeyValueStore.md)   |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-browser/src/BrowserPersistence.ts`](./packages/platform-browser/src/BrowserPersistence.md)       |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-browser/src/BrowserRuntime.ts`](./packages/platform-browser/src/BrowserRuntime.md)               |           1 |        1 |           0 |        0 |           0 |
| [`packages/platform-browser/src/BrowserSocket.ts`](./packages/platform-browser/src/BrowserSocket.md)                 |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-browser/src/BrowserStream.ts`](./packages/platform-browser/src/BrowserStream.md)                 |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-browser/src/BrowserWorker.ts`](./packages/platform-browser/src/BrowserWorker.md)                 |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-browser/src/BrowserWorkerRunner.ts`](./packages/platform-browser/src/BrowserWorkerRunner.md)     |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-browser/src/Clipboard.ts`](./packages/platform-browser/src/Clipboard.md)                         |           5 |        0 |           4 |        1 |           0 |
| [`packages/platform-browser/src/Geolocation.ts`](./packages/platform-browser/src/Geolocation.md)                     |           9 |        0 |           7 |        2 |           0 |
| [`packages/platform-browser/src/IndexedDb.ts`](./packages/platform-browser/src/IndexedDb.md)                         |           6 |        0 |           5 |        1 |           0 |
| [`packages/platform-browser/src/IndexedDbDatabase.ts`](./packages/platform-browser/src/IndexedDbDatabase.md)         |          11 |        0 |           2 |        8 |           1 |
| [`packages/platform-browser/src/IndexedDbQueryBuilder.ts`](./packages/platform-browser/src/IndexedDbQueryBuilder.md) |          31 |        0 |           2 |       28 |           1 |
| [`packages/platform-browser/src/IndexedDbTable.ts`](./packages/platform-browser/src/IndexedDbTable.md)               |          13 |        0 |           1 |       12 |           0 |
| [`packages/platform-browser/src/IndexedDbVersion.ts`](./packages/platform-browser/src/IndexedDbVersion.md)           |           7 |        0 |           0 |        7 |           0 |
| [`packages/platform-browser/src/Permissions.ts`](./packages/platform-browser/src/Permissions.md)                     |           8 |        0 |           5 |        3 |           0 |

</details>

<details>
<summary><code>@effect/platform-bun</code> (18 modules)</summary>

| Source module                                                                                              | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/platform-bun/src/BunClusterHttp.ts`](./packages/platform-bun/src/BunClusterHttp.md)             |           3 |        0 |           2 |        0 |           1 |
| [`packages/platform-bun/src/BunClusterSocket.ts`](./packages/platform-bun/src/BunClusterSocket.md)         |           4 |        0 |           2 |        0 |           2 |
| [`packages/platform-bun/src/BunCrypto.ts`](./packages/platform-bun/src/BunCrypto.md)                       |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunFileSystem.ts`](./packages/platform-bun/src/BunFileSystem.md)               |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunHttpPlatform.ts`](./packages/platform-bun/src/BunHttpPlatform.md)           |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunHttpServer.ts`](./packages/platform-bun/src/BunHttpServer.md)               |           8 |        1 |           5 |        2 |           0 |
| [`packages/platform-bun/src/BunHttpServerRequest.ts`](./packages/platform-bun/src/BunHttpServerRequest.md) |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunMultipart.ts`](./packages/platform-bun/src/BunMultipart.md)                 |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-bun/src/BunPath.ts`](./packages/platform-bun/src/BunPath.md)                           |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-bun/src/BunRedis.ts`](./packages/platform-bun/src/BunRedis.md)                         |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-bun/src/BunRuntime.ts`](./packages/platform-bun/src/BunRuntime.md)                     |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunServices.ts`](./packages/platform-bun/src/BunServices.md)                   |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-bun/src/BunSocket.ts`](./packages/platform-bun/src/BunSocket.md)                       |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-bun/src/BunStdio.ts`](./packages/platform-bun/src/BunStdio.md)                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunStream.ts`](./packages/platform-bun/src/BunStream.md)                       |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunTerminal.ts`](./packages/platform-bun/src/BunTerminal.md)                   |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-bun/src/BunWorker.ts`](./packages/platform-bun/src/BunWorker.md)                       |           2 |        1 |           1 |        0 |           0 |
| [`packages/platform-bun/src/BunWorkerRunner.ts`](./packages/platform-bun/src/BunWorkerRunner.md)           |           1 |        0 |           1 |        0 |           0 |

</details>

<details>
<summary><code>@effect/platform-deno</code> (20 modules)</summary>

| Source module                                                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/platform-deno/src/DenoChildProcessSpawner.ts`](./packages/platform-deno/src/DenoChildProcessSpawner.md) |           3 |        0 |           1 |        2 |           0 |
| [`packages/platform-deno/src/DenoClusterHttp.ts`](./packages/platform-deno/src/DenoClusterHttp.md)                 |           3 |        0 |           2 |        0 |           1 |
| [`packages/platform-deno/src/DenoClusterSocket.ts`](./packages/platform-deno/src/DenoClusterSocket.md)             |           4 |        0 |           2 |        2 |           0 |
| [`packages/platform-deno/src/DenoCrypto.ts`](./packages/platform-deno/src/DenoCrypto.md)                           |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-deno/src/DenoFileSystem.ts`](./packages/platform-deno/src/DenoFileSystem.md)                   |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-deno/src/DenoHttpPlatform.ts`](./packages/platform-deno/src/DenoHttpPlatform.md)               |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-deno/src/DenoHttpServer.ts`](./packages/platform-deno/src/DenoHttpServer.md)                   |           7 |        0 |           5 |        2 |           0 |
| [`packages/platform-deno/src/DenoHttpServerRequest.ts`](./packages/platform-deno/src/DenoHttpServerRequest.md)     |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-deno/src/DenoKeyValueStore.ts`](./packages/platform-deno/src/DenoKeyValueStore.md)             |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-deno/src/DenoMultipart.ts`](./packages/platform-deno/src/DenoMultipart.md)                     |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-deno/src/DenoPath.ts`](./packages/platform-deno/src/DenoPath.md)                               |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-deno/src/DenoRedis.ts`](./packages/platform-deno/src/DenoRedis.md)                             |           4 |        0 |           3 |        1 |           0 |
| [`packages/platform-deno/src/DenoRuntime.ts`](./packages/platform-deno/src/DenoRuntime.md)                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-deno/src/DenoServices.ts`](./packages/platform-deno/src/DenoServices.md)                       |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-deno/src/DenoSocket.ts`](./packages/platform-deno/src/DenoSocket.md)                           |           9 |        0 |           5 |        4 |           0 |
| [`packages/platform-deno/src/DenoSocketServer.ts`](./packages/platform-deno/src/DenoSocketServer.md)               |           6 |        0 |           4 |        2 |           0 |
| [`packages/platform-deno/src/DenoStdio.ts`](./packages/platform-deno/src/DenoStdio.md)                             |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-deno/src/DenoTerminal.ts`](./packages/platform-deno/src/DenoTerminal.md)                       |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-deno/src/DenoWorker.ts`](./packages/platform-deno/src/DenoWorker.md)                           |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-deno/src/DenoWorkerRunner.ts`](./packages/platform-deno/src/DenoWorkerRunner.md)               |           3 |        0 |           3 |        0 |           0 |

</details>

<details>
<summary><code>@effect/platform-node</code> (19 modules)</summary>

| Source module                                                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/platform-node/src/NodeClusterHttp.ts`](./packages/platform-node/src/NodeClusterHttp.md)                 |           3 |        0 |           1 |        1 |           1 |
| [`packages/platform-node/src/NodeClusterSocket.ts`](./packages/platform-node/src/NodeClusterSocket.md)             |           5 |        0 |           2 |        1 |           2 |
| [`packages/platform-node/src/NodeCrypto.ts`](./packages/platform-node/src/NodeCrypto.md)                           |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node/src/NodeFileSystem.ts`](./packages/platform-node/src/NodeFileSystem.md)                   |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node/src/NodeHttpClient.ts`](./packages/platform-node/src/NodeHttpClient.md)                   |          18 |        0 |          11 |        7 |           0 |
| [`packages/platform-node/src/NodeHttpIncomingMessage.ts`](./packages/platform-node/src/NodeHttpIncomingMessage.md) |           2 |        0 |           1 |        0 |           1 |
| [`packages/platform-node/src/NodeHttpPlatform.ts`](./packages/platform-node/src/NodeHttpPlatform.md)               |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-node/src/NodeHttpServer.ts`](./packages/platform-node/src/NodeHttpServer.md)                   |          10 |        1 |           5 |        4 |           0 |
| [`packages/platform-node/src/NodeHttpServerRequest.ts`](./packages/platform-node/src/NodeHttpServerRequest.md)     |           2 |        0 |           0 |        2 |           0 |
| [`packages/platform-node/src/NodeMultipart.ts`](./packages/platform-node/src/NodeMultipart.md)                     |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-node/src/NodePath.ts`](./packages/platform-node/src/NodePath.md)                               |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-node/src/NodeRedis.ts`](./packages/platform-node/src/NodeRedis.md)                             |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-node/src/NodeRuntime.ts`](./packages/platform-node/src/NodeRuntime.md)                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node/src/NodeServices.ts`](./packages/platform-node/src/NodeServices.md)                       |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-node/src/NodeSocket.ts`](./packages/platform-node/src/NodeSocket.md)                           |           3 |        0 |           1 |        2 |           0 |
| [`packages/platform-node/src/NodeStdio.ts`](./packages/platform-node/src/NodeStdio.md)                             |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node/src/NodeTerminal.ts`](./packages/platform-node/src/NodeTerminal.md)                       |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-node/src/NodeWorker.ts`](./packages/platform-node/src/NodeWorker.md)                           |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-node/src/NodeWorkerRunner.ts`](./packages/platform-node/src/NodeWorkerRunner.md)               |           1 |        0 |           1 |        0 |           0 |

</details>

<details>
<summary><code>@effect/platform-node-shared</code> (12 modules)</summary>

| Source module                                                                                                                    | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/platform-node-shared/src/NodeChildProcessSpawner.ts`](./packages/platform-node-shared/src/NodeChildProcessSpawner.md) |           3 |        0 |           1 |        2 |           0 |
| [`packages/platform-node-shared/src/NodeClusterSocket.ts`](./packages/platform-node-shared/src/NodeClusterSocket.md)             |           2 |        0 |           1 |        1 |           0 |
| [`packages/platform-node-shared/src/NodeCrypto.ts`](./packages/platform-node-shared/src/NodeCrypto.md)                           |           2 |        0 |           2 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeFileSystem.ts`](./packages/platform-node-shared/src/NodeFileSystem.md)                   |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node-shared/src/NodePath.ts`](./packages/platform-node-shared/src/NodePath.md)                               |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeRuntime.ts`](./packages/platform-node-shared/src/NodeRuntime.md)                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeSink.ts`](./packages/platform-node-shared/src/NodeSink.md)                               |           3 |        0 |           3 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeSocket.ts`](./packages/platform-node-shared/src/NodeSocket.md)                           |           5 |        0 |           4 |        1 |           0 |
| [`packages/platform-node-shared/src/NodeSocketServer.ts`](./packages/platform-node-shared/src/NodeSocketServer.md)               |           5 |        0 |           5 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeStdio.ts`](./packages/platform-node-shared/src/NodeStdio.md)                             |           1 |        0 |           1 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeStream.ts`](./packages/platform-node-shared/src/NodeStream.md)                           |          10 |        2 |           8 |        0 |           0 |
| [`packages/platform-node-shared/src/NodeTerminal.ts`](./packages/platform-node-shared/src/NodeTerminal.md)                       |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-clickhouse</code> (2 modules)</summary>

| Source module                                                                                              | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/clickhouse/src/ClickhouseClient.ts`](./packages/sql/clickhouse/src/ClickhouseClient.md)     |          13 |        0 |           4 |        7 |           2 |
| [`packages/sql/clickhouse/src/ClickhouseMigrator.ts`](./packages/sql/clickhouse/src/ClickhouseMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-d1</code> (1 modules)</summary>

| Source module                                                          | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/d1/src/D1Client.ts`](./packages/sql/d1/src/D1Client.md) |          10 |        0 |           4 |        4 |           2 |

</details>

<details>
<summary><code>@effect/sql-libsql</code> (2 modules)</summary>

| Source module                                                                              | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/libsql/src/LibsqlClient.ts`](./packages/sql/libsql/src/LibsqlClient.md)     |          20 |        0 |           4 |       14 |           2 |
| [`packages/sql/libsql/src/LibsqlMigrator.ts`](./packages/sql/libsql/src/LibsqlMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-mssql</code> (4 modules)</summary>

| Source module                                                                          | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/mssql/src/MssqlClient.ts`](./packages/sql/mssql/src/MssqlClient.md)     |          12 |        0 |           5 |        5 |           2 |
| [`packages/sql/mssql/src/MssqlMigrator.ts`](./packages/sql/mssql/src/MssqlMigrator.md) |           2 |        0 |           2 |        0 |           0 |
| [`packages/sql/mssql/src/Parameter.ts`](./packages/sql/mssql/src/Parameter.md)         |           4 |        0 |           0 |        2 |           2 |
| [`packages/sql/mssql/src/Procedure.ts`](./packages/sql/mssql/src/Procedure.md)         |          12 |        0 |           4 |        6 |           2 |

</details>

<details>
<summary><code>@effect/sql-mysql2</code> (2 modules)</summary>

| Source module                                                                            | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/mysql2/src/MysqlClient.ts`](./packages/sql/mysql2/src/MysqlClient.md)     |          11 |        0 |           4 |        5 |           2 |
| [`packages/sql/mysql2/src/MysqlMigrator.ts`](./packages/sql/mysql2/src/MysqlMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-pg</code> (2 modules)</summary>

| Source module                                                              | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/pg/src/PgClient.ts`](./packages/sql/pg/src/PgClient.md)     |          16 |        0 |           9 |        5 |           2 |
| [`packages/sql/pg/src/PgMigrator.ts`](./packages/sql/pg/src/PgMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-pglite</code> (2 modules)</summary>

| Source module                                                                              | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/pglite/src/PgliteClient.ts`](./packages/sql/pglite/src/PgliteClient.md)     |          17 |        0 |           6 |        9 |           2 |
| [`packages/sql/pglite/src/PgliteMigrator.ts`](./packages/sql/pglite/src/PgliteMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-bun</code> (2 modules)</summary>

| Source module                                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/sqlite-bun/src/SqliteClient.ts`](./packages/sql/sqlite-bun/src/SqliteClient.md)     |           9 |        0 |           4 |        3 |           2 |
| [`packages/sql/sqlite-bun/src/SqliteMigrator.ts`](./packages/sql/sqlite-bun/src/SqliteMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-do</code> (2 modules)</summary>

| Source module                                                                                    | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/sqlite-do/src/SqliteClient.ts`](./packages/sql/sqlite-do/src/SqliteClient.md)     |           9 |        0 |           4 |        3 |           2 |
| [`packages/sql/sqlite-do/src/SqliteMigrator.ts`](./packages/sql/sqlite-do/src/SqliteMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-node</code> (2 modules)</summary>

| Source module                                                                                        | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/sqlite-node/src/SqliteClient.ts`](./packages/sql/sqlite-node/src/SqliteClient.md)     |          10 |        0 |           4 |        4 |           2 |
| [`packages/sql/sqlite-node/src/SqliteMigrator.ts`](./packages/sql/sqlite-node/src/SqliteMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-react-native</code> (2 modules)</summary>

| Source module                                                                                                        | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/sqlite-react-native/src/SqliteClient.ts`](./packages/sql/sqlite-react-native/src/SqliteClient.md)     |          11 |        0 |           5 |        4 |           2 |
| [`packages/sql/sqlite-react-native/src/SqliteMigrator.ts`](./packages/sql/sqlite-react-native/src/SqliteMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-wasm</code> (3 modules)</summary>

| Source module                                                                                        | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/sql/sqlite-wasm/src/OpfsWorker.ts`](./packages/sql/sqlite-wasm/src/OpfsWorker.md)         |           2 |        0 |           1 |        1 |           0 |
| [`packages/sql/sqlite-wasm/src/SqliteClient.ts`](./packages/sql/sqlite-wasm/src/SqliteClient.md)     |          15 |        0 |           8 |        5 |           2 |
| [`packages/sql/sqlite-wasm/src/SqliteMigrator.ts`](./packages/sql/sqlite-wasm/src/SqliteMigrator.md) |           2 |        0 |           2 |        0 |           0 |

</details>

<details>
<summary><code>@effect/utils</code> (2 modules)</summary>

| Source module                                                                  | Suggestions | Required | Recommended | Optional | Discouraged |
| ------------------------------------------------------------------------------ | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/tools/utils/src/Codegen.ts`](./packages/tools/utils/src/Codegen.md) |           5 |        0 |           3 |        2 |           0 |
| [`packages/tools/utils/src/Glob.ts`](./packages/tools/utils/src/Glob.md)       |           4 |        0 |           3 |        1 |           0 |

</details>

<details>
<summary><code>@effect/vitest</code> (2 modules)</summary>

| Source module                                                    | Suggestions | Required | Recommended | Optional | Discouraged |
| ---------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/vitest/src/index.ts`](./packages/vitest/src/index.md) |          16 |        7 |           0 |        9 |           0 |
| [`packages/vitest/src/utils.ts`](./packages/vitest/src/utils.md) |          21 |        0 |          10 |       11 |           0 |

</details>

<details>
<summary><code>effect</code> (301 modules)</summary>

| Source module                                                                                                                                      | Suggestions | Required | Recommended | Optional | Discouraged |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | -------: | ----------: | -------: | ----------: |
| [`packages/effect/src/Array.ts`](./packages/effect/src/Array.md)                                                                                   |           6 |        0 |           2 |        4 |           0 |
| [`packages/effect/src/BigDecimal.ts`](./packages/effect/src/BigDecimal.md)                                                                         |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/BigInt.ts`](./packages/effect/src/BigInt.md)                                                                                 |           5 |        0 |           4 |        1 |           0 |
| [`packages/effect/src/Boolean.ts`](./packages/effect/src/Boolean.md)                                                                               |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/Brand.ts`](./packages/effect/src/Brand.md)                                                                                   |          22 |        0 |           3 |       19 |           0 |
| [`packages/effect/src/Cache.ts`](./packages/effect/src/Cache.md)                                                                                   |           3 |        0 |           2 |        1 |           0 |
| [`packages/effect/src/Cause.ts`](./packages/effect/src/Cause.md)                                                                                   |          18 |        1 |           1 |        7 |           9 |
| [`packages/effect/src/Channel.ts`](./packages/effect/src/Channel.md)                                                                               |          82 |        3 |          25 |       50 |           4 |
| [`packages/effect/src/ChannelSchema.ts`](./packages/effect/src/ChannelSchema.md)                                                                   |           6 |        0 |           6 |        0 |           0 |
| [`packages/effect/src/Clock.ts`](./packages/effect/src/Clock.md)                                                                                   |           8 |        0 |           1 |        4 |           3 |
| [`packages/effect/src/Combiner.ts`](./packages/effect/src/Combiner.md)                                                                             |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/Config.ts`](./packages/effect/src/Config.md)                                                                                 |          13 |        0 |           5 |        8 |           0 |
| [`packages/effect/src/ConfigProvider.ts`](./packages/effect/src/ConfigProvider.md)                                                                 |           4 |        0 |           0 |        4 |           0 |
| [`packages/effect/src/Console.ts`](./packages/effect/src/Console.md)                                                                               |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/Context.ts`](./packages/effect/src/Context.md)                                                                               |           8 |        0 |           1 |        5 |           2 |
| [`packages/effect/src/Cron.ts`](./packages/effect/src/Cron.md)                                                                                     |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/Crypto.ts`](./packages/effect/src/Crypto.md)                                                                                 |          13 |        0 |           1 |       10 |           2 |
| [`packages/effect/src/Data.ts`](./packages/effect/src/Data.md)                                                                                     |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/DateTime.ts`](./packages/effect/src/DateTime.md)                                                                             |          26 |        0 |           3 |       23 |           0 |
| [`packages/effect/src/Deferred.ts`](./packages/effect/src/Deferred.md)                                                                             |           4 |        0 |           1 |        1 |           2 |
| [`packages/effect/src/Differ.ts`](./packages/effect/src/Differ.md)                                                                                 |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/Duration.ts`](./packages/effect/src/Duration.md)                                                                             |           7 |        0 |           3 |        4 |           0 |
| [`packages/effect/src/Effect.ts`](./packages/effect/src/Effect.md)                                                                                 |          57 |        3 |          18 |       32 |           4 |
| [`packages/effect/src/Effectable.ts`](./packages/effect/src/Effectable.md)                                                                         |           2 |        0 |           1 |        0 |           1 |
| [`packages/effect/src/Encoding.ts`](./packages/effect/src/Encoding.md)                                                                             |           5 |        0 |           2 |        0 |           3 |
| [`packages/effect/src/ErrorReporter.ts`](./packages/effect/src/ErrorReporter.md)                                                                   |          11 |        0 |           3 |        6 |           2 |
| [`packages/effect/src/ExecutionPlan.ts`](./packages/effect/src/ExecutionPlan.md)                                                                   |          14 |        0 |           2 |       10 |           2 |
| [`packages/effect/src/Exit.ts`](./packages/effect/src/Exit.md)                                                                                     |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/Fiber.ts`](./packages/effect/src/Fiber.md)                                                                                   |           2 |        1 |           1 |        0 |           0 |
| [`packages/effect/src/FileSystem.ts`](./packages/effect/src/FileSystem.md)                                                                         |          43 |        0 |           1 |       41 |           1 |
| [`packages/effect/src/Filter.ts`](./packages/effect/src/Filter.md)                                                                                 |          19 |        0 |          15 |        4 |           0 |
| [`packages/effect/src/Function.ts`](./packages/effect/src/Function.md)                                                                             |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/Graph.ts`](./packages/effect/src/Graph.md)                                                                                   |          41 |        0 |           2 |       37 |           2 |
| [`packages/effect/src/Hash.ts`](./packages/effect/src/Hash.md)                                                                                     |           1 |        0 |           0 |        0 |           1 |
| [`packages/effect/src/HashRing.ts`](./packages/effect/src/HashRing.md)                                                                             |           9 |        0 |           7 |        2 |           0 |
| [`packages/effect/src/Inspectable.ts`](./packages/effect/src/Inspectable.md)                                                                       |           5 |        0 |           0 |        5 |           0 |
| [`packages/effect/src/Iterable.ts`](./packages/effect/src/Iterable.md)                                                                             |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/JsonPatch.ts`](./packages/effect/src/JsonPatch.md)                                                                           |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/JsonSchema.ts`](./packages/effect/src/JsonSchema.md)                                                                         |           7 |        0 |           2 |        5 |           0 |
| [`packages/effect/src/Latch.ts`](./packages/effect/src/Latch.md)                                                                                   |          16 |        0 |           5 |        7 |           4 |
| [`packages/effect/src/Layer.ts`](./packages/effect/src/Layer.md)                                                                                   |          19 |        0 |           6 |       11 |           2 |
| [`packages/effect/src/LayerMap.ts`](./packages/effect/src/LayerMap.md)                                                                             |          16 |        0 |           0 |       16 |           0 |
| [`packages/effect/src/LayerRef.ts`](./packages/effect/src/LayerRef.md)                                                                             |          13 |        0 |           0 |       13 |           0 |
| [`packages/effect/src/Logger.ts`](./packages/effect/src/Logger.md)                                                                                 |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/LogLevel.ts`](./packages/effect/src/LogLevel.md)                                                                             |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/ManagedRuntime.ts`](./packages/effect/src/ManagedRuntime.md)                                                                 |          14 |        0 |           1 |       13 |           0 |
| [`packages/effect/src/Match.ts`](./packages/effect/src/Match.md)                                                                                   |           5 |        0 |           2 |        3 |           0 |
| [`packages/effect/src/Metric.ts`](./packages/effect/src/Metric.md)                                                                                 |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/MutableHashMap.ts`](./packages/effect/src/MutableHashMap.md)                                                                 |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/MutableHashSet.ts`](./packages/effect/src/MutableHashSet.md)                                                                 |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/MutableList.ts`](./packages/effect/src/MutableList.md)                                                                       |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/Newtype.ts`](./packages/effect/src/Newtype.md)                                                                               |           4 |        0 |           0 |        4 |           0 |
| [`packages/effect/src/NonEmptyIterable.ts`](./packages/effect/src/NonEmptyIterable.md)                                                             |           2 |        0 |           0 |        1 |           1 |
| [`packages/effect/src/Number.ts`](./packages/effect/src/Number.md)                                                                                 |           5 |        0 |           4 |        1 |           0 |
| [`packages/effect/src/Optic.ts`](./packages/effect/src/Optic.md)                                                                                   |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/Option.ts`](./packages/effect/src/Option.md)                                                                                 |           8 |        0 |           0 |        8 |           0 |
| [`packages/effect/src/Order.ts`](./packages/effect/src/Order.md)                                                                                   |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/Ordering.ts`](./packages/effect/src/Ordering.md)                                                                             |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/PartitionedSemaphore.ts`](./packages/effect/src/PartitionedSemaphore.md)                                                     |          13 |        0 |           7 |        3 |           3 |
| [`packages/effect/src/Path.ts`](./packages/effect/src/Path.md)                                                                                     |           2 |        0 |           1 |        0 |           1 |
| [`packages/effect/src/Pipeable.ts`](./packages/effect/src/Pipeable.md)                                                                             |           4 |        0 |           0 |        3 |           1 |
| [`packages/effect/src/PlatformError.ts`](./packages/effect/src/PlatformError.md)                                                                   |           9 |        0 |           2 |        6 |           1 |
| [`packages/effect/src/Pool.ts`](./packages/effect/src/Pool.md)                                                                                     |          10 |        0 |           4 |        6 |           0 |
| [`packages/effect/src/PrimaryKey.ts`](./packages/effect/src/PrimaryKey.md)                                                                         |           2 |        0 |           0 |        1 |           1 |
| [`packages/effect/src/PubSub.ts`](./packages/effect/src/PubSub.md)                                                                                 |          14 |        0 |           0 |       11 |           3 |
| [`packages/effect/src/Pull.ts`](./packages/effect/src/Pull.md)                                                                                     |          14 |        0 |           8 |        6 |           0 |
| [`packages/effect/src/Queue.ts`](./packages/effect/src/Queue.md)                                                                                   |          14 |        0 |           4 |        7 |           3 |
| [`packages/effect/src/RcMap.ts`](./packages/effect/src/RcMap.md)                                                                                   |           6 |        0 |           1 |        5 |           0 |
| [`packages/effect/src/RcRef.ts`](./packages/effect/src/RcRef.md)                                                                                   |           2 |        0 |           1 |        0 |           1 |
| [`packages/effect/src/Record.ts`](./packages/effect/src/Record.md)                                                                                 |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/Redactable.ts`](./packages/effect/src/Redactable.md)                                                                         |           3 |        0 |           2 |        1 |           0 |
| [`packages/effect/src/Redacted.ts`](./packages/effect/src/Redacted.md)                                                                             |           1 |        0 |           0 |        0 |           1 |
| [`packages/effect/src/Reducer.ts`](./packages/effect/src/Reducer.md)                                                                               |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/Ref.ts`](./packages/effect/src/Ref.md)                                                                                       |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/References.ts`](./packages/effect/src/References.md)                                                                         |          11 |        1 |           2 |        8 |           0 |
| [`packages/effect/src/Request.ts`](./packages/effect/src/Request.md)                                                                               |          11 |        0 |           6 |        3 |           2 |
| [`packages/effect/src/RequestResolver.ts`](./packages/effect/src/RequestResolver.md)                                                               |          12 |        0 |           5 |        6 |           1 |
| [`packages/effect/src/Resource.ts`](./packages/effect/src/Resource.md)                                                                             |           6 |        1 |           4 |        1 |           0 |
| [`packages/effect/src/Result.ts`](./packages/effect/src/Result.md)                                                                                 |           6 |        0 |           0 |        6 |           0 |
| [`packages/effect/src/Runtime.ts`](./packages/effect/src/Runtime.md)                                                                               |           4 |        0 |           2 |        0 |           2 |
| [`packages/effect/src/Schedule.ts`](./packages/effect/src/Schedule.md)                                                                             |          13 |        0 |           3 |        9 |           1 |
| [`packages/effect/src/Scheduler.ts`](./packages/effect/src/Scheduler.md)                                                                           |           8 |        0 |           1 |        7 |           0 |
| [`packages/effect/src/Schema.ts`](./packages/effect/src/Schema.md)                                                                                 |         558 |        0 |          25 |      533 |           0 |
| [`packages/effect/src/SchemaAST.ts`](./packages/effect/src/SchemaAST.md)                                                                           |          78 |        0 |           5 |       73 |           0 |
| [`packages/effect/src/SchemaError.ts`](./packages/effect/src/SchemaError.md)                                                                       |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/SchemaGetter.ts`](./packages/effect/src/SchemaGetter.md)                                                                     |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/SchemaIssue.ts`](./packages/effect/src/SchemaIssue.md)                                                                       |          39 |        0 |           0 |       39 |           0 |
| [`packages/effect/src/SchemaParser.ts`](./packages/effect/src/SchemaParser.md)                                                                     |          25 |        0 |          11 |       14 |           0 |
| [`packages/effect/src/SchemaRepresentation.ts`](./packages/effect/src/SchemaRepresentation.md)                                                     |          71 |        0 |           9 |       62 |           0 |
| [`packages/effect/src/SchemaTransformation.ts`](./packages/effect/src/SchemaTransformation.md)                                                     |           6 |        0 |           0 |        6 |           0 |
| [`packages/effect/src/Scope.ts`](./packages/effect/src/Scope.md)                                                                                   |           2 |        0 |           1 |        0 |           1 |
| [`packages/effect/src/ScopedCache.ts`](./packages/effect/src/ScopedCache.md)                                                                       |          18 |        0 |          15 |        3 |           0 |
| [`packages/effect/src/ScopedRef.ts`](./packages/effect/src/ScopedRef.md)                                                                           |           6 |        0 |           4 |        1 |           1 |
| [`packages/effect/src/Semaphore.ts`](./packages/effect/src/Semaphore.md)                                                                           |          16 |        0 |           8 |        8 |           0 |
| [`packages/effect/src/Sink.ts`](./packages/effect/src/Sink.md)                                                                                     |          70 |        1 |          25 |       42 |           2 |
| [`packages/effect/src/Stdio.ts`](./packages/effect/src/Stdio.md)                                                                                   |           6 |        0 |           3 |        1 |           2 |
| [`packages/effect/src/Stream.ts`](./packages/effect/src/Stream.md)                                                                                 |          18 |        0 |          10 |        4 |           4 |
| [`packages/effect/src/String.ts`](./packages/effect/src/String.md)                                                                                 |           9 |        0 |           1 |        8 |           0 |
| [`packages/effect/src/SubscriptionRef.ts`](./packages/effect/src/SubscriptionRef.md)                                                               |           5 |        0 |           2 |        2 |           1 |
| [`packages/effect/src/SynchronizedRef.ts`](./packages/effect/src/SynchronizedRef.md)                                                               |          24 |        0 |          12 |       10 |           2 |
| [`packages/effect/src/Take.ts`](./packages/effect/src/Take.md)                                                                                     |           2 |        0 |           1 |        1 |           0 |
| [`packages/effect/src/Terminal.ts`](./packages/effect/src/Terminal.md)                                                                             |          19 |        0 |           4 |       14 |           1 |
| [`packages/effect/src/testing/TestClock.ts`](./packages/effect/src/testing/TestClock.md)                                                           |           5 |        0 |           0 |        5 |           0 |
| [`packages/effect/src/testing/TestConsole.ts`](./packages/effect/src/testing/TestConsole.md)                                                       |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/testing/TestSchema.ts`](./packages/effect/src/testing/TestSchema.md)                                                         |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/Tracer.ts`](./packages/effect/src/Tracer.md)                                                                                 |           9 |        0 |           0 |        9 |           0 |
| [`packages/effect/src/TxDeferred.ts`](./packages/effect/src/TxDeferred.md)                                                                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/TxPubSub.ts`](./packages/effect/src/TxPubSub.md)                                                                             |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/TxQueue.ts`](./packages/effect/src/TxQueue.md)                                                                               |           7 |        0 |           0 |        4 |           3 |
| [`packages/effect/src/Types.ts`](./packages/effect/src/Types.md)                                                                                   |           7 |        0 |           0 |        7 |           0 |
| [`packages/effect/src/UndefinedOr.ts`](./packages/effect/src/UndefinedOr.md)                                                                       |           8 |        0 |           3 |        5 |           0 |
| [`packages/effect/src/Unify.ts`](./packages/effect/src/Unify.md)                                                                                   |           6 |        0 |           0 |        0 |           6 |
| [`packages/effect/src/unstable/ai/AiError.ts`](./packages/effect/src/unstable/ai/AiError.md)                                                       |          54 |        0 |           3 |       33 |          18 |
| [`packages/effect/src/unstable/ai/AnthropicStructuredOutput.ts`](./packages/effect/src/unstable/ai/AnthropicStructuredOutput.md)                   |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/ai/Chat.ts`](./packages/effect/src/unstable/ai/Chat.md)                                                             |          12 |        0 |           4 |        8 |           0 |
| [`packages/effect/src/unstable/ai/EmbeddingModel.ts`](./packages/effect/src/unstable/ai/EmbeddingModel.md)                                         |          10 |        0 |           3 |        7 |           0 |
| [`packages/effect/src/unstable/ai/IdGenerator.ts`](./packages/effect/src/unstable/ai/IdGenerator.md)                                               |           4 |        0 |           0 |        4 |           0 |
| [`packages/effect/src/unstable/ai/LanguageModel.ts`](./packages/effect/src/unstable/ai/LanguageModel.md)                                           |          38 |        0 |           2 |       36 |           0 |
| [`packages/effect/src/unstable/ai/McpProtocol.ts`](./packages/effect/src/unstable/ai/McpProtocol.md)                                               |           3 |        0 |           0 |        2 |           1 |
| [`packages/effect/src/unstable/ai/McpSchema.ts`](./packages/effect/src/unstable/ai/McpSchema.md)                                                   |         123 |        0 |          25 |       75 |          23 |
| [`packages/effect/src/unstable/ai/McpServer.ts`](./packages/effect/src/unstable/ai/McpServer.md)                                                   |          16 |        0 |          11 |        5 |           0 |
| [`packages/effect/src/unstable/ai/Model.ts`](./packages/effect/src/unstable/ai/Model.md)                                                           |           5 |        0 |           2 |        3 |           0 |
| [`packages/effect/src/unstable/ai/OpenAiStructuredOutput.ts`](./packages/effect/src/unstable/ai/OpenAiStructuredOutput.md)                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/ai/Prompt.ts`](./packages/effect/src/unstable/ai/Prompt.md)                                                         |         129 |        0 |          10 |      119 |           0 |
| [`packages/effect/src/unstable/ai/Response.ts`](./packages/effect/src/unstable/ai/Response.md)                                                     |         198 |        0 |           7 |      191 |           0 |
| [`packages/effect/src/unstable/ai/ResponseIdTracker.ts`](./packages/effect/src/unstable/ai/ResponseIdTracker.md)                                   |           4 |        0 |           2 |        2 |           0 |
| [`packages/effect/src/unstable/ai/Telemetry.ts`](./packages/effect/src/unstable/ai/Telemetry.md)                                                   |          30 |        0 |           1 |       29 |           0 |
| [`packages/effect/src/unstable/ai/Tokenizer.ts`](./packages/effect/src/unstable/ai/Tokenizer.md)                                                   |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/unstable/ai/Tool.ts`](./packages/effect/src/unstable/ai/Tool.md)                                                             |          73 |        0 |           2 |       64 |           7 |
| [`packages/effect/src/unstable/ai/Toolkit.ts`](./packages/effect/src/unstable/ai/Toolkit.md)                                                       |          19 |        0 |           0 |       19 |           0 |
| [`packages/effect/src/unstable/cli/Argument.ts`](./packages/effect/src/unstable/cli/Argument.md)                                                   |           1 |        0 |           0 |        1 |           0 |
| [`packages/effect/src/unstable/cli/CliConfig.ts`](./packages/effect/src/unstable/cli/CliConfig.md)                                                 |           7 |        0 |           2 |        5 |           0 |
| [`packages/effect/src/unstable/cli/CliError.ts`](./packages/effect/src/unstable/cli/CliError.md)                                                   |          18 |        0 |           0 |       10 |           8 |
| [`packages/effect/src/unstable/cli/Command.ts`](./packages/effect/src/unstable/cli/Command.md)                                                     |          31 |        0 |          10 |       20 |           1 |
| [`packages/effect/src/unstable/cli/Completions.ts`](./packages/effect/src/unstable/cli/Completions.md)                                             |           7 |        0 |           0 |        7 |           0 |
| [`packages/effect/src/unstable/cli/Flag.ts`](./packages/effect/src/unstable/cli/Flag.md)                                                           |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/unstable/cli/GlobalFlag.ts`](./packages/effect/src/unstable/cli/GlobalFlag.md)                                               |          15 |        0 |           1 |       14 |           0 |
| [`packages/effect/src/unstable/cli/HelpDoc.ts`](./packages/effect/src/unstable/cli/HelpDoc.md)                                                     |          28 |        0 |           0 |       28 |           0 |
| [`packages/effect/src/unstable/cli/Param.ts`](./packages/effect/src/unstable/cli/Param.md)                                                         |          24 |        0 |           3 |       20 |           1 |
| [`packages/effect/src/unstable/cli/Primitive.ts`](./packages/effect/src/unstable/cli/Primitive.md)                                                 |           4 |        0 |           0 |        3 |           1 |
| [`packages/effect/src/unstable/cli/Prompt.ts`](./packages/effect/src/unstable/cli/Prompt.md)                                                       |         100 |        0 |           5 |       95 |           0 |
| [`packages/effect/src/unstable/cluster/ClusterCron.ts`](./packages/effect/src/unstable/cluster/ClusterCron.md)                                     |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/ClusterError.ts`](./packages/effect/src/unstable/cluster/ClusterError.md)                                   |          21 |        0 |           7 |        7 |           7 |
| [`packages/effect/src/unstable/cluster/ClusterMetrics.ts`](./packages/effect/src/unstable/cluster/ClusterMetrics.md)                               |           5 |        0 |           0 |        5 |           0 |
| [`packages/effect/src/unstable/cluster/ClusterSchema.ts`](./packages/effect/src/unstable/cluster/ClusterSchema.md)                                 |           8 |        0 |           0 |        8 |           0 |
| [`packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts`](./packages/effect/src/unstable/cluster/ClusterWorkflowEngine.md)                 |           2 |        0 |           1 |        1 |           0 |
| [`packages/effect/src/unstable/cluster/DeliverAt.ts`](./packages/effect/src/unstable/cluster/DeliverAt.md)                                         |           4 |        0 |           1 |        2 |           1 |
| [`packages/effect/src/unstable/cluster/Entity.ts`](./packages/effect/src/unstable/cluster/Entity.md)                                               |          29 |        0 |           5 |       24 |           0 |
| [`packages/effect/src/unstable/cluster/EntityAddress.ts`](./packages/effect/src/unstable/cluster/EntityAddress.md)                                 |           6 |        0 |           0 |        5 |           1 |
| [`packages/effect/src/unstable/cluster/EntityId.ts`](./packages/effect/src/unstable/cluster/EntityId.md)                                           |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/unstable/cluster/EntityProxy.ts`](./packages/effect/src/unstable/cluster/EntityProxy.md)                                     |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/unstable/cluster/EntityProxyServer.ts`](./packages/effect/src/unstable/cluster/EntityProxyServer.md)                         |           3 |        0 |           2 |        1 |           0 |
| [`packages/effect/src/unstable/cluster/EntityResource.ts`](./packages/effect/src/unstable/cluster/EntityResource.md)                               |           6 |        1 |           2 |        1 |           2 |
| [`packages/effect/src/unstable/cluster/EntityType.ts`](./packages/effect/src/unstable/cluster/EntityType.md)                                       |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/unstable/cluster/Envelope.ts`](./packages/effect/src/unstable/cluster/Envelope.md)                                           |          29 |        0 |           4 |       22 |           3 |
| [`packages/effect/src/unstable/cluster/HttpRunner.ts`](./packages/effect/src/unstable/cluster/HttpRunner.md)                                       |          13 |        0 |          13 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/K8sHttpClient.ts`](./packages/effect/src/unstable/cluster/K8sHttpClient.md)                                 |           6 |        0 |           5 |        1 |           0 |
| [`packages/effect/src/unstable/cluster/MachineId.ts`](./packages/effect/src/unstable/cluster/MachineId.md)                                         |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/unstable/cluster/Message.ts`](./packages/effect/src/unstable/cluster/Message.md)                                             |          15 |        0 |           5 |       10 |           0 |
| [`packages/effect/src/unstable/cluster/MessageStorage.ts`](./packages/effect/src/unstable/cluster/MessageStorage.md)                               |          34 |        0 |           7 |       27 |           0 |
| [`packages/effect/src/unstable/cluster/Reply.ts`](./packages/effect/src/unstable/cluster/Reply.md)                                                 |          26 |        0 |           5 |       19 |           2 |
| [`packages/effect/src/unstable/cluster/Runner.ts`](./packages/effect/src/unstable/cluster/Runner.md)                                               |          10 |        0 |           0 |        9 |           1 |
| [`packages/effect/src/unstable/cluster/RunnerAddress.ts`](./packages/effect/src/unstable/cluster/RunnerAddress.md)                                 |           8 |        0 |           0 |        7 |           1 |
| [`packages/effect/src/unstable/cluster/RunnerHealth.ts`](./packages/effect/src/unstable/cluster/RunnerHealth.md)                                   |           6 |        0 |           5 |        1 |           0 |
| [`packages/effect/src/unstable/cluster/Runners.ts`](./packages/effect/src/unstable/cluster/Runners.md)                                             |          10 |        0 |           8 |        2 |           0 |
| [`packages/effect/src/unstable/cluster/RunnerServer.ts`](./packages/effect/src/unstable/cluster/RunnerServer.md)                                   |           4 |        0 |           4 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/RunnerStorage.ts`](./packages/effect/src/unstable/cluster/RunnerStorage.md)                                 |          13 |        0 |           2 |       11 |           0 |
| [`packages/effect/src/unstable/cluster/ShardId.ts`](./packages/effect/src/unstable/cluster/ShardId.md)                                             |           7 |        0 |           4 |        3 |           0 |
| [`packages/effect/src/unstable/cluster/Sharding.ts`](./packages/effect/src/unstable/cluster/Sharding.md)                                           |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/ShardingConfig.ts`](./packages/effect/src/unstable/cluster/ShardingConfig.md)                               |           8 |        0 |           5 |        3 |           0 |
| [`packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts`](./packages/effect/src/unstable/cluster/ShardingRegistrationEvent.md)         |           4 |        0 |           0 |        4 |           0 |
| [`packages/effect/src/unstable/cluster/SingleRunner.ts`](./packages/effect/src/unstable/cluster/SingleRunner.md)                                   |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/Singleton.ts`](./packages/effect/src/unstable/cluster/Singleton.md)                                         |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/SingletonAddress.ts`](./packages/effect/src/unstable/cluster/SingletonAddress.md)                           |           4 |        0 |           0 |        3 |           1 |
| [`packages/effect/src/unstable/cluster/Snowflake.ts`](./packages/effect/src/unstable/cluster/Snowflake.md)                                         |          21 |        0 |           4 |       15 |           2 |
| [`packages/effect/src/unstable/cluster/SocketRunner.ts`](./packages/effect/src/unstable/cluster/SocketRunner.md)                                   |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/SqlMessageStorage.ts`](./packages/effect/src/unstable/cluster/SqlMessageStorage.md)                         |           3 |        0 |           3 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/SqlRunnerStorage.ts`](./packages/effect/src/unstable/cluster/SqlRunnerStorage.md)                           |           3 |        0 |           3 |        0 |           0 |
| [`packages/effect/src/unstable/cluster/TestRunner.ts`](./packages/effect/src/unstable/cluster/TestRunner.md)                                       |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/devtools/DevTools.ts`](./packages/effect/src/unstable/devtools/DevTools.md)                                         |           3 |        0 |           3 |        0 |           0 |
| [`packages/effect/src/unstable/devtools/DevToolsClient.ts`](./packages/effect/src/unstable/devtools/DevToolsClient.md)                             |           5 |        0 |           3 |        2 |           0 |
| [`packages/effect/src/unstable/devtools/DevToolsSchema.ts`](./packages/effect/src/unstable/devtools/DevToolsSchema.md)                             |          44 |        0 |           3 |       41 |           0 |
| [`packages/effect/src/unstable/devtools/DevToolsServer.ts`](./packages/effect/src/unstable/devtools/DevToolsServer.md)                             |           2 |        0 |           1 |        1 |           0 |
| [`packages/effect/src/unstable/encoding/Msgpack.ts`](./packages/effect/src/unstable/encoding/Msgpack.md)                                           |          12 |        0 |           9 |        2 |           1 |
| [`packages/effect/src/unstable/encoding/Ndjson.ts`](./packages/effect/src/unstable/encoding/Ndjson.md)                                             |          15 |        0 |          11 |        3 |           1 |
| [`packages/effect/src/unstable/encoding/Sse.ts`](./packages/effect/src/unstable/encoding/Sse.md)                                                   |          27 |        0 |           9 |       16 |           2 |
| [`packages/effect/src/unstable/eventlog/Event.ts`](./packages/effect/src/unstable/eventlog/Event.md)                                               |          29 |        0 |           3 |       24 |           2 |
| [`packages/effect/src/unstable/eventlog/EventGroup.ts`](./packages/effect/src/unstable/eventlog/EventGroup.md)                                     |          13 |        0 |           1 |       10 |           2 |
| [`packages/effect/src/unstable/eventlog/EventJournal.ts`](./packages/effect/src/unstable/eventlog/EventJournal.md)                                 |          28 |        0 |          10 |       11 |           7 |
| [`packages/effect/src/unstable/eventlog/EventLog.ts`](./packages/effect/src/unstable/eventlog/EventLog.md)                                         |          31 |        0 |          14 |       13 |           4 |
| [`packages/effect/src/unstable/eventlog/EventLogEncryption.ts`](./packages/effect/src/unstable/eventlog/EventLogEncryption.md)                     |           6 |        0 |           2 |        4 |           0 |
| [`packages/effect/src/unstable/eventlog/EventLogMessage.ts`](./packages/effect/src/unstable/eventlog/EventLogMessage.md)                           |          20 |        0 |           1 |        4 |          15 |
| [`packages/effect/src/unstable/eventlog/EventLogRemote.ts`](./packages/effect/src/unstable/eventlog/EventLogRemote.md)                             |           8 |        0 |           5 |        3 |           0 |
| [`packages/effect/src/unstable/eventlog/EventLogServer.ts`](./packages/effect/src/unstable/eventlog/EventLogServer.md)                             |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/unstable/eventlog/EventLogServerEncrypted.ts`](./packages/effect/src/unstable/eventlog/EventLogServerEncrypted.md)           |           7 |        0 |           3 |        4 |           0 |
| [`packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts`](./packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.md)       |          16 |        0 |          12 |        4 |           0 |
| [`packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts`](./packages/effect/src/unstable/eventlog/EventLogSessionAuth.md)                   |          15 |        0 |           8 |        7 |           0 |
| [`packages/effect/src/unstable/eventlog/SqlEventJournal.ts`](./packages/effect/src/unstable/eventlog/SqlEventJournal.md)                           |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts`](./packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.md)     |           3 |        0 |           3 |        0 |           0 |
| [`packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.ts`](./packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.md) |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/unstable/http/Cookies.ts`](./packages/effect/src/unstable/http/Cookies.md)                                                   |          38 |        0 |          20 |       13 |           5 |
| [`packages/effect/src/unstable/http/Etag.ts`](./packages/effect/src/unstable/http/Etag.md)                                                         |           7 |        0 |           2 |        5 |           0 |
| [`packages/effect/src/unstable/http/FetchHttpClient.ts`](./packages/effect/src/unstable/http/FetchHttpClient.md)                                   |           3 |        0 |           2 |        1 |           0 |
| [`packages/effect/src/unstable/http/Headers.ts`](./packages/effect/src/unstable/http/Headers.md)                                                   |          20 |        0 |           9 |        8 |           3 |
| [`packages/effect/src/unstable/http/HttpBody.ts`](./packages/effect/src/unstable/http/HttpBody.md)                                                 |          28 |        0 |           6 |       20 |           2 |
| [`packages/effect/src/unstable/http/HttpClient.ts`](./packages/effect/src/unstable/http/HttpClient.md)                                             |          56 |        1 |          25 |       30 |           0 |
| [`packages/effect/src/unstable/http/HttpClientError.ts`](./packages/effect/src/unstable/http/HttpClientError.md)                                   |          28 |        0 |           9 |       18 |           1 |
| [`packages/effect/src/unstable/http/HttpClientRequest.ts`](./packages/effect/src/unstable/http/HttpClientRequest.md)                               |          51 |        0 |          25 |       25 |           1 |
| [`packages/effect/src/unstable/http/HttpClientResponse.ts`](./packages/effect/src/unstable/http/HttpClientResponse.md)                             |          12 |        0 |           7 |        4 |           1 |
| [`packages/effect/src/unstable/http/HttpEffect.ts`](./packages/effect/src/unstable/http/HttpEffect.md)                                             |          12 |        2 |           6 |        3 |           1 |
| [`packages/effect/src/unstable/http/HttpIncomingMessage.ts`](./packages/effect/src/unstable/http/HttpIncomingMessage.md)                           |           8 |        0 |           4 |        3 |           1 |
| [`packages/effect/src/unstable/http/HttpMethod.ts`](./packages/effect/src/unstable/http/HttpMethod.md)                                             |           7 |        0 |           1 |        6 |           0 |
| [`packages/effect/src/unstable/http/HttpMiddleware.ts`](./packages/effect/src/unstable/http/HttpMiddleware.md)                                     |          13 |        0 |           7 |        6 |           0 |
| [`packages/effect/src/unstable/http/HttpPlatform.ts`](./packages/effect/src/unstable/http/HttpPlatform.md)                                         |           3 |        0 |           3 |        0 |           0 |
| [`packages/effect/src/unstable/http/HttpRouter.ts`](./packages/effect/src/unstable/http/HttpRouter.md)                                             |          35 |        0 |          14 |       21 |           0 |
| [`packages/effect/src/unstable/http/HttpServer.ts`](./packages/effect/src/unstable/http/HttpServer.md)                                             |          14 |        0 |           7 |        7 |           0 |
| [`packages/effect/src/unstable/http/HttpServerError.ts`](./packages/effect/src/unstable/http/HttpServerError.md)                                   |          15 |        0 |          10 |        5 |           0 |
| [`packages/effect/src/unstable/http/HttpServerRequest.ts`](./packages/effect/src/unstable/http/HttpServerRequest.md)                               |          21 |        0 |           8 |       12 |           1 |
| [`packages/effect/src/unstable/http/HttpServerRespondable.ts`](./packages/effect/src/unstable/http/HttpServerRespondable.md)                       |           6 |        0 |           4 |        1 |           1 |
| [`packages/effect/src/unstable/http/HttpServerResponse.ts`](./packages/effect/src/unstable/http/HttpServerResponse.md)                             |          39 |        0 |          16 |       19 |           4 |
| [`packages/effect/src/unstable/http/HttpTraceContext.ts`](./packages/effect/src/unstable/http/HttpTraceContext.md)                                 |           6 |        0 |           5 |        1 |           0 |
| [`packages/effect/src/unstable/http/Multipart.ts`](./packages/effect/src/unstable/http/Multipart.md)                                               |          35 |        0 |          11 |       22 |           2 |
| [`packages/effect/src/unstable/http/Template.ts`](./packages/effect/src/unstable/http/Template.md)                                                 |           9 |        0 |           2 |        7 |           0 |
| [`packages/effect/src/unstable/http/Url.ts`](./packages/effect/src/unstable/http/Url.md)                                                           |          12 |        0 |           2 |       10 |           0 |
| [`packages/effect/src/unstable/http/UrlParams.ts`](./packages/effect/src/unstable/http/UrlParams.md)                                               |          24 |        0 |          11 |       13 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApi.ts`](./packages/effect/src/unstable/httpapi/HttpApi.md)                                             |          13 |        0 |           2 |       11 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiBuilder.ts`](./packages/effect/src/unstable/httpapi/HttpApiBuilder.md)                               |          14 |        0 |           5 |        9 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiClient.ts`](./packages/effect/src/unstable/httpapi/HttpApiClient.md)                                 |          13 |        0 |           4 |        9 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts`](./packages/effect/src/unstable/httpapi/HttpApiEndpoint.md)                             |          61 |        0 |           9 |       52 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiError.ts`](./packages/effect/src/unstable/httpapi/HttpApiError.md)                                   |          29 |        0 |          27 |        0 |           2 |
| [`packages/effect/src/unstable/httpapi/HttpApiGroup.ts`](./packages/effect/src/unstable/httpapi/HttpApiGroup.md)                                   |          28 |        0 |           1 |       27 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts`](./packages/effect/src/unstable/httpapi/HttpApiMiddleware.md)                         |          20 |        0 |           3 |       17 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiScalar.ts`](./packages/effect/src/unstable/httpapi/HttpApiScalar.md)                                 |          21 |        0 |           2 |       19 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiSchema.ts`](./packages/effect/src/unstable/httpapi/HttpApiSchema.md)                                 |          34 |        0 |          15 |       15 |           4 |
| [`packages/effect/src/unstable/httpapi/HttpApiSecurity.ts`](./packages/effect/src/unstable/httpapi/HttpApiSecurity.md)                             |          14 |        0 |           1 |       13 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiSwagger.ts`](./packages/effect/src/unstable/httpapi/HttpApiSwagger.md)                               |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/httpapi/HttpApiTest.ts`](./packages/effect/src/unstable/httpapi/HttpApiTest.md)                                     |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/httpapi/OpenApi.ts`](./packages/effect/src/unstable/httpapi/OpenApi.md)                                             |          39 |        0 |           0 |       39 |           0 |
| [`packages/effect/src/unstable/observability/Otlp.ts`](./packages/effect/src/unstable/observability/Otlp.md)                                       |           4 |        0 |           4 |        0 |           0 |
| [`packages/effect/src/unstable/observability/OtlpExporter.ts`](./packages/effect/src/unstable/observability/OtlpExporter.md)                       |           3 |        1 |           1 |        1 |           0 |
| [`packages/effect/src/unstable/observability/OtlpLogger.ts`](./packages/effect/src/unstable/observability/OtlpLogger.md)                           |           4 |        0 |           3 |        1 |           0 |
| [`packages/effect/src/unstable/observability/OtlpMetrics.ts`](./packages/effect/src/unstable/observability/OtlpMetrics.md)                         |           4 |        0 |           3 |        1 |           0 |
| [`packages/effect/src/unstable/observability/OtlpResource.ts`](./packages/effect/src/unstable/observability/OtlpResource.md)                       |          25 |        0 |           2 |       22 |           1 |
| [`packages/effect/src/unstable/observability/OtlpSerialization.ts`](./packages/effect/src/unstable/observability/OtlpSerialization.md)             |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/unstable/observability/OtlpTracer.ts`](./packages/effect/src/unstable/observability/OtlpTracer.md)                           |           6 |        0 |           3 |        3 |           0 |
| [`packages/effect/src/unstable/observability/PrometheusMetrics.ts`](./packages/effect/src/unstable/observability/PrometheusMetrics.md)             |           6 |        0 |           0 |        5 |           1 |
| [`packages/effect/src/unstable/persistence/KeyValueStore.ts`](./packages/effect/src/unstable/persistence/KeyValueStore.md)                         |          46 |        0 |           7 |       38 |           1 |
| [`packages/effect/src/unstable/persistence/Persistable.ts`](./packages/effect/src/unstable/persistence/Persistable.md)                             |          15 |        0 |           4 |       10 |           1 |
| [`packages/effect/src/unstable/persistence/PersistedCache.ts`](./packages/effect/src/unstable/persistence/PersistedCache.md)                       |           2 |        0 |           1 |        1 |           0 |
| [`packages/effect/src/unstable/persistence/PersistedQueue.ts`](./packages/effect/src/unstable/persistence/PersistedQueue.md)                       |          19 |        0 |           9 |        5 |           5 |
| [`packages/effect/src/unstable/persistence/Persistence.ts`](./packages/effect/src/unstable/persistence/Persistence.md)                             |          18 |        0 |           4 |       12 |           2 |
| [`packages/effect/src/unstable/persistence/RateLimiter.ts`](./packages/effect/src/unstable/persistence/RateLimiter.md)                             |          41 |        0 |           9 |       27 |           5 |
| [`packages/effect/src/unstable/persistence/Redis.ts`](./packages/effect/src/unstable/persistence/Redis.md)                                         |           7 |        0 |           4 |        2 |           1 |
| [`packages/effect/src/unstable/process/ChildProcess.ts`](./packages/effect/src/unstable/process/ChildProcess.md)                                   |          43 |        0 |           3 |       40 |           0 |
| [`packages/effect/src/unstable/process/ChildProcessSpawner.ts`](./packages/effect/src/unstable/process/ChildProcessSpawner.md)                     |          19 |        0 |           2 |       17 |           0 |
| [`packages/effect/src/unstable/reactivity/AsyncResult.ts`](./packages/effect/src/unstable/reactivity/AsyncResult.md)                               |          48 |        0 |          27 |       19 |           2 |
| [`packages/effect/src/unstable/reactivity/Atom.ts`](./packages/effect/src/unstable/reactivity/Atom.md)                                             |          76 |        0 |          25 |       40 |          11 |
| [`packages/effect/src/unstable/reactivity/AtomHttpApi.ts`](./packages/effect/src/unstable/reactivity/AtomHttpApi.md)                               |           2 |        0 |           1 |        1 |           0 |
| [`packages/effect/src/unstable/reactivity/AtomRef.ts`](./packages/effect/src/unstable/reactivity/AtomRef.md)                                       |           7 |        0 |           0 |        5 |           2 |
| [`packages/effect/src/unstable/reactivity/AtomRegistry.ts`](./packages/effect/src/unstable/reactivity/AtomRegistry.md)                             |          13 |        0 |           8 |        3 |           2 |
| [`packages/effect/src/unstable/reactivity/AtomRpc.ts`](./packages/effect/src/unstable/reactivity/AtomRpc.md)                                       |           2 |        0 |           1 |        1 |           0 |
| [`packages/effect/src/unstable/reactivity/Hydration.ts`](./packages/effect/src/unstable/reactivity/Hydration.md)                                   |           5 |        0 |           0 |        5 |           0 |
| [`packages/effect/src/unstable/reactivity/Reactivity.ts`](./packages/effect/src/unstable/reactivity/Reactivity.md)                                 |           7 |        0 |           7 |        0 |           0 |
| [`packages/effect/src/unstable/rpc/Rpc.ts`](./packages/effect/src/unstable/rpc/Rpc.md)                                                             |          59 |        0 |           6 |       53 |           0 |
| [`packages/effect/src/unstable/rpc/RpcClient.ts`](./packages/effect/src/unstable/rpc/RpcClient.md)                                                 |          18 |        0 |           3 |        8 |           7 |
| [`packages/effect/src/unstable/rpc/RpcClientError.ts`](./packages/effect/src/unstable/rpc/RpcClientError.md)                                       |           3 |        0 |           2 |        0 |           1 |
| [`packages/effect/src/unstable/rpc/RpcGroup.ts`](./packages/effect/src/unstable/rpc/RpcGroup.md)                                                   |          21 |        0 |           0 |       21 |           0 |
| [`packages/effect/src/unstable/rpc/RpcMessage.ts`](./packages/effect/src/unstable/rpc/RpcMessage.md)                                               |          33 |        0 |           3 |       28 |           2 |
| [`packages/effect/src/unstable/rpc/RpcMiddleware.ts`](./packages/effect/src/unstable/rpc/RpcMiddleware.md)                                         |          20 |        0 |           2 |       16 |           2 |
| [`packages/effect/src/unstable/rpc/RpcSchema.ts`](./packages/effect/src/unstable/rpc/RpcSchema.md)                                                 |           4 |        0 |           2 |        2 |           0 |
| [`packages/effect/src/unstable/rpc/RpcSerialization.ts`](./packages/effect/src/unstable/rpc/RpcSerialization.md)                                   |          19 |        0 |          13 |        6 |           0 |
| [`packages/effect/src/unstable/rpc/RpcServer.ts`](./packages/effect/src/unstable/rpc/RpcServer.md)                                                 |          21 |        0 |           5 |        2 |          14 |
| [`packages/effect/src/unstable/rpc/RpcTest.ts`](./packages/effect/src/unstable/rpc/RpcTest.md)                                                     |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/rpc/RpcWorker.ts`](./packages/effect/src/unstable/rpc/RpcWorker.md)                                                 |           6 |        0 |           4 |        2 |           0 |
| [`packages/effect/src/unstable/rpc/Utils.ts`](./packages/effect/src/unstable/rpc/Utils.md)                                                         |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/unstable/schema/Model.ts`](./packages/effect/src/unstable/schema/Model.md)                                                   |          54 |        0 |          23 |       31 |           0 |
| [`packages/effect/src/unstable/schema/VariantSchema.ts`](./packages/effect/src/unstable/schema/VariantSchema.md)                                   |          25 |        0 |           6 |       18 |           1 |
| [`packages/effect/src/unstable/socket/Socket.ts`](./packages/effect/src/unstable/socket/Socket.md)                                                 |          41 |        0 |          21 |       15 |           5 |
| [`packages/effect/src/unstable/socket/SocketServer.ts`](./packages/effect/src/unstable/socket/SocketServer.md)                                     |          12 |        0 |           4 |        5 |           3 |
| [`packages/effect/src/unstable/sql/Migrator.ts`](./packages/effect/src/unstable/sql/Migrator.md)                                                   |          10 |        0 |           3 |        7 |           0 |
| [`packages/effect/src/unstable/sql/SqlClient.ts`](./packages/effect/src/unstable/sql/SqlClient.md)                                                 |          17 |        1 |           3 |       13 |           0 |
| [`packages/effect/src/unstable/sql/SqlConnection.ts`](./packages/effect/src/unstable/sql/SqlConnection.md)                                         |           5 |        0 |           1 |        4 |           0 |
| [`packages/effect/src/unstable/sql/SqlError.ts`](./packages/effect/src/unstable/sql/SqlError.md)                                                   |          45 |        0 |          17 |       16 |          12 |
| [`packages/effect/src/unstable/sql/SqlModel.ts`](./packages/effect/src/unstable/sql/SqlModel.md)                                                   |           2 |        0 |           2 |        0 |           0 |
| [`packages/effect/src/unstable/sql/SqlResolver.ts`](./packages/effect/src/unstable/sql/SqlResolver.md)                                             |           7 |        0 |           5 |        2 |           0 |
| [`packages/effect/src/unstable/sql/SqlSchema.ts`](./packages/effect/src/unstable/sql/SqlSchema.md)                                                 |           5 |        0 |           5 |        0 |           0 |
| [`packages/effect/src/unstable/sql/SqlStream.ts`](./packages/effect/src/unstable/sql/SqlStream.md)                                                 |           1 |        0 |           1 |        0 |           0 |
| [`packages/effect/src/unstable/sql/Statement.ts`](./packages/effect/src/unstable/sql/Statement.md)                                                 |          47 |        0 |           3 |       43 |           1 |
| [`packages/effect/src/unstable/workers/Transferable.ts`](./packages/effect/src/unstable/workers/Transferable.md)                                   |          10 |        0 |           6 |        3 |           1 |
| [`packages/effect/src/unstable/workers/Worker.ts`](./packages/effect/src/unstable/workers/Worker.md)                                               |           9 |        1 |           2 |        5 |           1 |
| [`packages/effect/src/unstable/workers/WorkerError.ts`](./packages/effect/src/unstable/workers/WorkerError.md)                                     |          10 |        0 |           1 |        7 |           2 |
| [`packages/effect/src/unstable/workers/WorkerRunner.ts`](./packages/effect/src/unstable/workers/WorkerRunner.md)                                   |           3 |        0 |           0 |        3 |           0 |
| [`packages/effect/src/unstable/workflow/Activity.ts`](./packages/effect/src/unstable/workflow/Activity.md)                                         |           8 |        0 |           4 |        4 |           0 |
| [`packages/effect/src/unstable/workflow/DurableClock.ts`](./packages/effect/src/unstable/workflow/DurableClock.md)                                 |           3 |        0 |           1 |        2 |           0 |
| [`packages/effect/src/unstable/workflow/DurableDeferred.ts`](./packages/effect/src/unstable/workflow/DurableDeferred.md)                           |          23 |        0 |          11 |       10 |           2 |
| [`packages/effect/src/unstable/workflow/DurableQueue.ts`](./packages/effect/src/unstable/workflow/DurableQueue.md)                                 |           6 |        0 |           3 |        1 |           2 |
| [`packages/effect/src/unstable/workflow/Workflow.ts`](./packages/effect/src/unstable/workflow/Workflow.md)                                         |          39 |        5 |          10 |       22 |           2 |
| [`packages/effect/src/unstable/workflow/WorkflowEngine.ts`](./packages/effect/src/unstable/workflow/WorkflowEngine.md)                             |           5 |        1 |           2 |        1 |           1 |
| [`packages/effect/src/unstable/workflow/WorkflowProxy.ts`](./packages/effect/src/unstable/workflow/WorkflowProxy.md)                               |           2 |        0 |           0 |        2 |           0 |
| [`packages/effect/src/unstable/workflow/WorkflowProxyServer.ts`](./packages/effect/src/unstable/workflow/WorkflowProxyServer.md)                   |           3 |        0 |           2 |        1 |           0 |
| [`packages/effect/src/Utils.ts`](./packages/effect/src/Utils.md)                                                                                   |           2 |        0 |           0 |        2 |           0 |

</details>
