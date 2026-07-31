# Public API JSDoc Audit

Audit date: 2026-07-31

## Scope and Method

This audit covers non-generated `packages/**/src/**/*.ts` modules, excluding generated barrels, generated source modules, and `internal` directories. `packages/atom/vue/src/index.ts` and `packages/vitest/src/index.ts` are inventoried separately because they contain implementations in addition to barrel exports. The scope includes stable and unstable Effect modules, testing modules, provider packages, SQL packages, published tools, and workspace-only tools.

The repository's `@effect/jsdocs` extractor supplied the declaration, namespace, documented-member, tag, and example model. A broader one-off run removed the configured `packages/tools/**` exclusion. A TypeScript syntax pass counted direct root exports while excluding declarations marked `@internal`. These are different units: root exports count directly exported declarations, while API records also include namespaces, declarations inside namespaces, and documented members.

Example classification is mechanical and conservative:

- **Asserted** examples contain at least one trailing `// =>` semantic assertion.
- **Type-only** examples have no semantic assertion and exist to demonstrate inference or assignability.
- **Execution-only** examples run but have no semantic assertion.
- **Without examples** is an inventory state, not automatically a defect.

Structural diagnostics use the extractor's standard JSDoc shape. Editorial findings such as misleading, duplicated, or low-value examples were reviewed separately against implementations, tests, and nearby APIs.

## Coverage Summary

- Modules inventoried: **531**
- Direct public root exports inventoried: **7599**
- Parsed API records reviewed: **9618**
- API records with examples: **3282**
- API records without examples: **6336**
- Type-only example records: **87**
- Execution-only example records: **19**
- Runnable asserted example records: **3176**
- Extracted declaration examples: **3370**
- Remaining broad-extractor diagnostics: **26** across **25** file/range groups
- Examples added: **1**
- Existing examples corrected or materially rewritten: **10**
- Low-value or duplicated examples removed: **7**
- Public tool API records made structurally compliant: **65**

The **6336** no-example records were intentionally not bulk-filled. Most are types, models, fields, symbols, protocols, straightforward constructors/accessors, provider bindings, or related API families already taught nearby. APIs identified as valuable example candidates remain in the prioritized backlog below; this audit does not imply that every other no-example API should permanently remain example-free.

The 26 broad-extractor diagnostics comprise 12 deduplicated missing-JSDoc diagnostics for the 42 `@effect/api-diff` exports, six import-style diagnostics in `@effect/ai-codegen`, six diagnostics across the implementation-bearing Atom Vue and Vitest index modules, one tsconfig exclusion in `@effect/ai-docgen`, and one intentionally hidden package-subpath diagnostic in `@effect/utils`.

## Example-Suggestion Handoff

The executable backlog for a later documentation agent is in [`public-api-example-suggestions/`](./public-api-example-suggestions/README.md). It mirrors source paths and contains one Markdown file for each module with uncovered exports.

- Modules with uncovered exports: **499**
- Per-export suggestions: **6404**
- Required: **37**
- Recommended: **1728**
- Optional: **4266**
- Discouraged: **373**
- Direct exports absent from the compliant model but included syntactically: **68**

Each export entry records its source line, kind, category, description, signature and import hints, a natural-language snippet scenario, an optional contrast, and future-agent advice. These are research prompts rather than automatic edit instructions: the later agent must inspect implementations, tests, typetests, call sites, sibling APIs, and existing module examples, and should downgrade or reject suggestions that repository evidence does not support.

## Completed Improvements

### Correctness

- `packages/effect/src/DateTime.ts`: corrected `now` and `nowAsDate` examples so each executes the documented API.
- `packages/effect/src/SchemaRepresentation.ts`: added a persistence and restoration example for `fromRepresentation`, including the static-type boundary after loading a persisted representation.
- `packages/tools/openapi-generator/src/OpenApiPatch.ts`: changed seven runnable examples to the supported named-import style without changing their behavior.

### Example Quality

- `packages/effect/src/Function.ts`: reduced `pipe` from five examples to two distinct examples; removed one example that never called `pipe` and two duplicate arithmetic pipelines.
- `packages/effect/src/NonEmptyIterable.ts`: removed an unsafe-cast-heavy model example and replaced the 87-line `unprepend` example with a direct `Chunk.make` example showing both tuple results.
- `packages/effect/src/unstable/httpapi/HttpApiScalar.ts`: removed two member examples that only reassigned string literals.
- `packages/platform-deno/src/DenoRuntime.ts`: removed a module example that demonstrated `Effect.runPromise` instead of `runMain`; a runnable `runMain` example would interfere with process lifecycle.

### Structural Documentation

- `packages/tools/docgen/src/{CLI,Checker,Configuration,Core,Domain,Parser,Printer}.ts`: added concise descriptions and required categories to 42 exported API records, normalized local categories, and added useful module summaries.
- `packages/tools/jsdocs/src/Jsdocs.ts`: documented 23 exported model, configuration, extraction, persistence, and hashing APIs. No examples were added because these contracts and direct helpers are clear from their descriptions and signatures.
- `packages/platform-deno/src/DenoRuntime.ts`: normalized `Runtime` to the shared `running` category.

The module-level `@see` and gotchas audit found no additional links or caveats worth adding to the edited tool modules. Their APIs are direct parser/checker/model helpers, and extra cross-links would add navigation noise.

## Package Inventory

| Package                           | Private | Modules | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| --------------------------------- | :-----: | ------: | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `@effect/ai-anthropic`            |   no    |       6 |           88 |         157 |             0 |              157 |         0 |              0 |           0 |
| `@effect/ai-codegen`              |   yes   |       6 |           26 |          43 |            11 |               32 |         0 |              0 |           6 |
| `@effect/ai-docgen`               |   yes   |       1 |            3 |           0 |             0 |                0 |         0 |              0 |           1 |
| `@effect/ai-openai`               |   no    |       8 |           62 |         102 |             0 |              102 |         0 |              0 |           0 |
| `@effect/ai-openai-compat`        |   no    |       6 |           65 |          79 |             0 |               79 |         0 |              0 |           0 |
| `@effect/ai-openrouter`           |   no    |       4 |           18 |          27 |             0 |               27 |         0 |              0 |           0 |
| `@effect/api-diff`                |   yes   |      12 |           42 |           0 |             0 |                0 |         0 |              0 |          12 |
| `@effect/atom-react`              |   no    |       4 |           19 |          20 |             2 |               18 |         0 |              0 |           0 |
| `@effect/atom-solid`              |   no    |       2 |           13 |          13 |             0 |               13 |         0 |              0 |           0 |
| `@effect/atom-vue`                |   no    |       1 |           13 |           0 |             0 |                0 |         0 |              0 |           2 |
| `@effect/bundle`                  |   yes   |       5 |           17 |          17 |             0 |               17 |         0 |              0 |           0 |
| `@effect/docgen`                  |   no    |       7 |           44 |          45 |             0 |               45 |         0 |              0 |           0 |
| `@effect/doctest`                 |   no    |       6 |           18 |          18 |             0 |               18 |         0 |              0 |           0 |
| `@effect/jsdocs`                  |   yes   |       1 |           45 |          45 |             1 |               44 |         0 |              0 |           0 |
| `@effect/openapi-generator`       |   no    |       7 |           45 |          50 |             7 |               43 |         0 |              0 |           0 |
| `@effect/opentelemetry`           |   no    |       6 |           35 |          35 |             1 |               34 |         0 |              0 |           0 |
| `@effect/platform-browser`        |   no    |      17 |           86 |         115 |             0 |              115 |         0 |              0 |           0 |
| `@effect/platform-bun`            |   no    |      18 |           39 |          39 |             0 |               39 |         0 |              0 |           0 |
| `@effect/platform-deno`           |   no    |      20 |           60 |          60 |             0 |               60 |         0 |              0 |           0 |
| `@effect/platform-node`           |   no    |      21 |           63 |          65 |             0 |               65 |         0 |              0 |           0 |
| `@effect/platform-node-shared`    |   no    |      12 |           39 |          38 |             0 |               38 |         0 |              0 |           0 |
| `@effect/sql-clickhouse`          |   no    |       2 |           13 |          15 |             0 |               15 |         0 |              0 |           0 |
| `@effect/sql-d1`                  |   no    |       1 |            6 |          10 |             0 |               10 |         0 |              0 |           0 |
| `@effect/sql-libsql`              |   no    |       2 |            8 |          22 |             0 |               22 |         0 |              0 |           0 |
| `@effect/sql-mssql`               |   no    |       4 |           21 |          30 |             0 |               30 |         0 |              0 |           0 |
| `@effect/sql-mysql2`              |   no    |       2 |            9 |          13 |             0 |               13 |         0 |              0 |           0 |
| `@effect/sql-pg`                  |   no    |       2 |           16 |          18 |             0 |               18 |         0 |              0 |           0 |
| `@effect/sql-pglite`              |   no    |       2 |           12 |          19 |             0 |               19 |         0 |              0 |           0 |
| `@effect/sql-sqlite-bun`          |   no    |       2 |            8 |          11 |             0 |               11 |         0 |              0 |           0 |
| `@effect/sql-sqlite-do`           |   no    |       2 |            8 |          11 |             0 |               11 |         0 |              0 |           0 |
| `@effect/sql-sqlite-node`         |   no    |       2 |            9 |          12 |             0 |               12 |         0 |              0 |           0 |
| `@effect/sql-sqlite-react-native` |   no    |       2 |           10 |          13 |             0 |               13 |         0 |              0 |           0 |
| `@effect/sql-sqlite-wasm`         |   no    |       3 |           16 |          19 |             0 |               19 |         0 |              0 |           0 |
| `@effect/utils`                   |   yes   |       3 |            8 |           9 |             0 |                9 |         0 |              0 |           1 |
| `@effect/vitest`                  |   no    |       2 |           32 |          21 |             0 |               21 |         0 |              0 |           4 |
| `effect`                          |   no    |     330 |         6583 |        8427 |          3260 |             5167 |        87 |             19 |           0 |

## Remaining Priorities

1. **Document the private API-diff tool surface.** All 42 direct exports in `packages/tools/api-diff/src/*.ts` lack standard JSDoc. Start with public entrypoints and models at `Annotations.ts:7`, `ApiDiff.ts:22`, `Cli.ts:52`, `Diff.ts:399`, `Discovery.ts:29`, `Error.ts:3`, `Json.ts:4`, `MigrationDoc.ts:259`, `Model.ts:3`, `Report.ts:55`, `Snapshot.ts:219`, and `Worktrees.ts:15`.
2. **Resolve implementation-bearing index ownership.** `packages/atom/vue/src/index.ts:13` contains 13 direct exports with tag-only JSDoc. `packages/vitest/src/index.ts:18` contains 11 direct declarations plus namespace members with missing descriptions/categories and an old loose example. They cannot be fixed in this pass because repository policy treats `index.ts` files as generated.
3. **Bring tool packages into routine extraction.** `jsdocs.config.json:9` excludes every tool package, including published `@effect/docgen`, `@effect/doctest`, and `@effect/openapi-generator`. The broader audit now finds those published packages structurally clean, so they can be included without documentation diagnostics.
4. **Restore automated enforcement or explicitly replace it.** `package.json:26` runs Oxlint and dprint but no JSDoc extraction check. The former model-backed Oxlint rule was removed, so current guidance claiming `pnpm lint` validates public JSDoc is stale.
5. **Add package-entrypoint examples selectively.** AI provider, platform, SQL, and Vitest packages have little or no declaration-level example coverage. Prioritize bounded examples for `packages/platform-node/src/NodeHttpServer.ts:93`, `packages/opentelemetry/src/NodeSdk.ts:109`, and `packages/atom/react/src/Hooks.ts:113`; do not add examples to every provider binding.
6. **Replace tautological examples.** `packages/effect/src/Logger.ts:798`, `:823`, and `:846` assert only `Logger.isLogger` for format-specific loggers. `packages/effect/src/Schedule.ts:712` and `:742` assert only `Schedule.isSchedule` for timing schedules. Replace them only if deterministic behavior can be asserted concisely; otherwise remove them.
7. **Normalize category families.** High-confidence groups include `packages/effect/src/Types.ts:119` and 19 related `types` categories to `utility types`, `packages/effect/src/MutableRef.ts:169` and seven related `general` categories, `packages/effect/src/Option.ts:190`, `packages/effect/src/Result.ts:243`, `packages/platform-browser/src/BrowserRuntime.ts:32`, `IndexedDbTable.ts:26`, and `IndexedDbVersion.ts:30`.
8. **Shorten oversized type examples.** The examples for `Metric.Attributes` at `packages/effect/src/Metric.ts:1107`, `Metric.AttributeSet` at `:1188`, and `Metric.Snapshot` at `:1577` use full programs to explain type models. Prefer focused type-level examples or one semantic projection.
9. **Resolve module-JSDoc attachment ambiguity.** Top-of-file overviews are not represented as module docs in 14 files when attached to directives or first declarations, including `packages/effect/src/Types.ts:1`, `Differ.ts:1`, `NonEmptyIterable.ts:1`, `Pipeable.ts:1`, `packages/atom/react/src/Hooks.ts:1`, and provider error modules. Maintainer input is needed on parser behavior versus source-layout convention.

## Intentional No-Example Decisions

### Types, Models, and Metadata

Type aliases, interfaces, namespace contracts, variance markers, symbols, type IDs, protocol fields, and model-only classes remain without examples when prose and signatures fully describe them. This includes the 65 tool API records documented in this pass.

### Direct Helpers and Re-exports

Straightforward getters, constants, named re-exports, parser collection helpers, and one-step schema/service bindings remain example-free when an example would merely repeat the signature.

### Families with Representative Coverage

Overloads, data-first/data-last forms, adjacent constructors, and repetitive collection operations remain example-free when another API or module-level example already teaches the shared behavior. The audit does not require one example per overload.

### Disproportionate or Unsafe Setup

Process entrypoints, environment-specific provider layers, external-service clients, low-level unsafe functions, and resource APIs remain example-free when a runnable example would require lifecycle interference, credentials, network access, filesystem assumptions, or unsafe casts. `DenoRuntime.runMain` is the concrete decision made in this pass.

### Editorial Backlog

No-example status is not considered sufficient for common entrypoints or behavior with important failure, empty, asynchronous, lazy, scoped, concurrency, or resource-safety semantics. Those APIs should be prioritized by reader value rather than filled mechanically; representative candidates are listed above.

## Coverage Criteria

### Required

Require an example when an API is a common entrypoint and its setup or execution cannot be inferred safely, or when a non-obvious failure, empty, boundary, lazy, scoped, asynchronous, concurrency, or resource-safety contract is central to correct use and is not already demonstrated by a nearby module example.

### Recommended

Recommend an example for semantic data transformations involving `Option`, `Result`, `Exit`, `Cause`, schemas, effects, streams, or collections; for curried composition that is not obvious; and when the distinction from a similarly named API is best shown by one short assertion.

### Optional

Treat examples as optional for familiar pure operations, direct constructors/getters, simple service or schema bindings, and overload families where prose, signature, and representative neighboring coverage already answer likely questions.

### Discouraged

Discourage examples for self-explanatory type metadata, symbols, protocol details, re-exports, tautological type guards or assignments, unsafe APIs that would normalize misuse, and APIs whose only runnable example requires external state or disproportionate scaffolding.

## Automation Candidates

- Include published tool packages in `jsdocs.config.json`; distinguish package visibility from the current blanket `packages/tools/**` exclusion.
- Run `pnpm jsdocs --check` or an equivalent read-only extractor check from lint/CI. Current `--check` rewrites a stale model, so a truly read-only mode would be preferable.
- Preserve every diagnostic range. `packages/tools/jsdocs/src/Jsdocs.ts:1070-1081` deduplicates by code and message only, collapsing many missing-JSDoc errors in one file and making totals misleading.
- Enforce category normalization separately from category presence: casing, vague categories, singular/plural families, `Context.Service`/`Context.Reference` as `services`, and known aliases such as `types` to `utility types`.
- Detect module comments attached to directives or first declarations and either classify them as module docs or report a source-layout diagnostic.
- Detect implementation-bearing `index.ts` modules before applying the generated-barrel exclusion.
- Flag runnable examples whose body never references the documented API name, while allowing module examples and deliberate indirect/type-level demonstrations.
- Report examples that only assert a generic type guard for an API documented for specific runtime behavior; this should be advisory because some guard examples are valid.
- Report duplicate or near-duplicate examples on one API by normalized call shape as an advisory, not an error.

## Ambiguous Cases Requiring Maintainer Input

- `jsdocs.config.json:9`: whether private tool packages are part of the enforced public-doc contract, and whether published tools should be included immediately.
- `package.json:26`: whether JSDoc extraction should return to `lint` or remain a separate CI job.
- `packages/tools/jsdocs/src/Jsdocs.ts:1070-1081`: whether diagnostic deduplication should include source ranges.
- `packages/tools/doctest/src/Source.ts` and `Plugin.ts`: guidance documents `import.meta.vitest suite`, but the current parser does not give `suite` distinct collection behavior.
- `packages/tools/ai-docgen/src/Glob.ts:1`: excluded from `tsconfig.packages.json`, so the broader extractor cannot classify its three exports.
- `packages/tools/utils/src/commands/codegen.ts:1`: source exports exist under a package subpath explicitly hidden by `package.json`; confirm that this file should remain outside public documentation inventory.
- `packages/atom/vue/src/index.ts:13` and `packages/vitest/src/index.ts:18`: confirm whether these implementation-bearing indexes are generated, then either move implementations to normal modules or permit direct documentation edits.

## Validation

- Targeted Oxlint on all changed source files: passed.
- Targeted dprint check on all changed source files: passed.
- `pnpm doctest --run` for the first changed-source batch: 5 files, 116 examples passed.
- `pnpm doctest --run packages/effect/src/SchemaRepresentation.ts`: 1 example passed after correcting its static schema type.
- `pnpm doctest --run packages/tools/jsdocs/src/Jsdocs.ts`: 1 example passed.
- Package-local `pnpm docgen` in `packages/effect`: passed; 3,322 examples typechecked.
- Package-local `pnpm docgen` in `packages/platform-deno`: passed; 1 example typechecked.
- Package-local `pnpm docgen` in `packages/tools/docgen`: passed; no examples.
- Package-local `pnpm docgen` in `packages/tools/openapi-generator`: command passed but `docgen.json` excludes every TypeScript file, so it did not validate the changed example file.
- Package-local `pnpm docgen` in `packages/tools/jsdocs`: command passed but `docgen.json` excludes every TypeScript file, so it did not validate the changed source file.
- `pnpm jsdocs --check`: passed for the configured surface and regenerated the ignored `.data/jsdocs.json` model with no diagnostics.
- Suggestion-directory integrity check: passed; 500 Markdown files, 499 module files, 6,404 entries, 6,404 scenarios, 6,404 advice records, 499 valid index links, and 6,404 valid source references.
- `pnpm lint-fix`: passed and formatted the report plus all 500 suggestion-directory Markdown files.
- `pnpm lint`: passed.
- `pnpm check`: passed.
- `git diff --check`: passed.

## Module Inventory

<details>
<summary><code>@effect/ai-anthropic</code> (6 modules)</summary>

| Module                                                | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ----------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/ai/anthropic/src/AnthropicClient.ts`        |            7 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/ai/anthropic/src/AnthropicConfig.ts`        |            2 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/ai/anthropic/src/AnthropicError.ts`         |            2 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/ai/anthropic/src/AnthropicLanguageModel.ts` |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/ai/anthropic/src/AnthropicTelemetry.ts`     |            6 |          11 |             0 |               11 |         0 |              0 |           0 |
| `packages/ai/anthropic/src/AnthropicTool.ts`          |           63 |         108 |             0 |              108 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/ai-codegen</code> (6 modules)</summary>

| Module                                         | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ---------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/ai-codegen/src/Config.ts`      |            6 |          18 |             4 |               14 |         0 |              0 |           1 |
| `packages/tools/ai-codegen/src/Discovery.ts`   |            5 |           6 |             3 |                3 |         0 |              0 |           2 |
| `packages/tools/ai-codegen/src/Generator.ts`   |            6 |           7 |             2 |                5 |         0 |              0 |           1 |
| `packages/tools/ai-codegen/src/Glob.ts`        |            3 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/tools/ai-codegen/src/PostProcess.ts` |            3 |           4 |             1 |                3 |         0 |              0 |           1 |
| `packages/tools/ai-codegen/src/SpecFetcher.ts` |            3 |           4 |             1 |                3 |         0 |              0 |           1 |

</details>

<details>
<summary><code>@effect/ai-docgen</code> (1 modules)</summary>

| Module                                 | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/ai-docgen/src/Glob.ts` |            3 |           0 |             0 |                0 |         0 |              0 |           1 |

</details>

<details>
<summary><code>@effect/ai-openai</code> (8 modules)</summary>

| Module                                           | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------ | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/ai/openai/src/OpenAiClient.ts`         |           10 |          19 |             0 |               19 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiConfig.ts`         |            2 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiEmbeddingModel.ts` |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiError.ts`          |            2 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiLanguageModel.ts`  |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiSchema.ts`         |           18 |          35 |             0 |               35 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiTelemetry.ts`      |            8 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/ai/openai/src/OpenAiTool.ts`           |           10 |          10 |             0 |               10 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/ai-openai-compat</code> (6 modules)</summary>

| Module                                                  | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/ai/openai-compat/src/OpenAiClient.ts`         |           42 |          42 |             0 |               42 |         0 |              0 |           0 |
| `packages/ai/openai-compat/src/OpenAiConfig.ts`         |            2 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/ai/openai-compat/src/OpenAiEmbeddingModel.ts` |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/ai/openai-compat/src/OpenAiError.ts`          |            2 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/ai/openai-compat/src/OpenAiLanguageModel.ts`  |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/ai/openai-compat/src/OpenAiTelemetry.ts`      |            8 |          12 |             0 |               12 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/ai-openrouter</code> (4 modules)</summary>

| Module                                                  | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/ai/openrouter/src/OpenRouterClient.ts`        |            7 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/ai/openrouter/src/OpenRouterConfig.ts`        |            2 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/ai/openrouter/src/OpenRouterError.ts`         |            2 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/ai/openrouter/src/OpenRouterLanguageModel.ts` |            7 |           7 |             0 |                7 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/api-diff</code> (12 modules)</summary>

| Module                                        | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| --------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/api-diff/src/Annotations.ts`  |            2 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/ApiDiff.ts`      |            2 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Cli.ts`          |            1 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Diff.ts`         |            1 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Discovery.ts`    |            2 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Error.ts`        |            1 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Json.ts`         |            4 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/MigrationDoc.ts` |            6 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Model.ts`        |           15 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Report.ts`       |            1 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Snapshot.ts`     |            5 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/api-diff/src/Worktrees.ts`    |            2 |           0 |             0 |                0 |         0 |              0 |           1 |

</details>

<details>
<summary><code>@effect/atom-react</code> (4 modules)</summary>

| Module                                       | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/atom/react/src/Hooks.ts`           |           11 |          11 |             0 |               11 |         0 |              0 |           0 |
| `packages/atom/react/src/ReactHydration.ts`  |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/atom/react/src/RegistryContext.ts` |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/atom/react/src/ScopedAtom.ts`      |            3 |           4 |             2 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/atom-solid</code> (2 modules)</summary>

| Module                                       | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/atom/solid/src/Hooks.ts`           |           11 |          11 |             0 |               11 |         0 |              0 |           0 |
| `packages/atom/solid/src/RegistryContext.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/atom-vue</code> (1 modules)</summary>

| Module                           | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/atom/vue/src/index.ts` |           13 |           0 |             0 |                0 |         0 |              0 |           2 |

</details>

<details>
<summary><code>@effect/bundle</code> (5 modules)</summary>

| Module                                  | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| --------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/bundle/src/Cli.ts`      |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/bundle/src/Fixtures.ts` |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/bundle/src/Plugins.ts`  |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/tools/bundle/src/Reporter.ts` |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/tools/bundle/src/Rollup.ts`   |            5 |           5 |             0 |                5 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/docgen</code> (7 modules)</summary>

| Module                                       | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/docgen/src/Checker.ts`       |            9 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/tools/docgen/src/CLI.ts`           |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/docgen/src/Configuration.ts` |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/tools/docgen/src/Core.ts`          |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/docgen/src/Domain.ts`        |           16 |          17 |             0 |               17 |         0 |              0 |           0 |
| `packages/tools/docgen/src/Parser.ts`        |           10 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/tools/docgen/src/Printer.ts`       |            3 |           3 |             0 |                3 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/doctest</code> (6 modules)</summary>

| Module                                    | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ----------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/doctest/src/Plugin.ts`    |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/doctest/src/Protocol.ts`  |            9 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/tools/doctest/src/Runner.ts`    |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/doctest/src/Runtime.ts`   |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/tools/doctest/src/Source.ts`    |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/tools/doctest/src/Transform.ts` |            1 |           1 |             0 |                1 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/jsdocs</code> (1 modules)</summary>

| Module                                | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/jsdocs/src/Jsdocs.ts` |           45 |          45 |             1 |               44 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/openapi-generator</code> (7 modules)</summary>

| Module                                                        | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/openapi-generator/src/HttpApiTransformer.ts`  |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/tools/openapi-generator/src/JsonSchemaGenerator.ts` |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/tools/openapi-generator/src/OpenApiGenerator.ts`    |            8 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/tools/openapi-generator/src/OpenApiPatch.ts`        |           11 |          12 |             7 |                5 |         0 |              0 |           0 |
| `packages/tools/openapi-generator/src/OpenApiTransformer.ts`  |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/tools/openapi-generator/src/ParsedOperation.ts`     |           13 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/tools/openapi-generator/src/Utils.ts`               |            5 |           5 |             0 |                5 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/opentelemetry</code> (6 modules)</summary>

| Module                                      | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/opentelemetry/src/NodeSdk.ts`     |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/opentelemetry/src/OtelLogger.ts`  |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/opentelemetry/src/OtelMetrics.ts` |            4 |           4 |             1 |                3 |         0 |              0 |           0 |
| `packages/opentelemetry/src/OtelTracer.ts`  |           14 |          14 |             0 |               14 |         0 |              0 |           0 |
| `packages/opentelemetry/src/Resource.ts`    |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/opentelemetry/src/WebSdk.ts`      |            3 |           3 |             0 |                3 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/platform-browser</code> (17 modules)</summary>

| Module                                                   | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/platform-browser/src/BrowserCrypto.ts`         |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserHttpClient.ts`     |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserKeyValueStore.ts`  |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserPersistence.ts`    |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserRuntime.ts`        |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserSocket.ts`         |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserStream.ts`         |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserWorker.ts`         |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-browser/src/BrowserWorkerRunner.ts`   |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-browser/src/Clipboard.ts`             |            4 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/platform-browser/src/Geolocation.ts`           |            8 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/platform-browser/src/IndexedDb.ts`             |            5 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/platform-browser/src/IndexedDbDatabase.ts`     |           10 |          11 |             0 |               11 |         0 |              0 |           0 |
| `packages/platform-browser/src/IndexedDbQueryBuilder.ts` |            8 |          31 |             0 |               31 |         0 |              0 |           0 |
| `packages/platform-browser/src/IndexedDbTable.ts`        |           13 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/platform-browser/src/IndexedDbVersion.ts`      |            7 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/platform-browser/src/Permissions.ts`           |            6 |           8 |             0 |                8 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/platform-bun</code> (18 modules)</summary>

| Module                                              | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| --------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/platform-bun/src/BunClusterHttp.ts`       |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunClusterSocket.ts`     |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunCrypto.ts`            |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunFileSystem.ts`        |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunHttpPlatform.ts`      |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunHttpServer.ts`        |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunHttpServerRequest.ts` |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunMultipart.ts`         |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunPath.ts`              |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunRedis.ts`             |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunRuntime.ts`           |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunServices.ts`          |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunSocket.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunStdio.ts`             |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunStream.ts`            |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunTerminal.ts`          |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunWorker.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-bun/src/BunWorkerRunner.ts`      |            1 |           1 |             0 |                1 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/platform-deno</code> (20 modules)</summary>

| Module                                                  | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/platform-deno/src/DenoChildProcessSpawner.ts` |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoClusterHttp.ts`         |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoClusterSocket.ts`       |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoCrypto.ts`              |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoFileSystem.ts`          |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoHttpPlatform.ts`        |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoHttpServer.ts`          |            7 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoHttpServerRequest.ts`   |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoKeyValueStore.ts`       |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoMultipart.ts`           |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoPath.ts`                |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoRedis.ts`               |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoRuntime.ts`             |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoServices.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoSocket.ts`              |            9 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoSocketServer.ts`        |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoStdio.ts`               |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoTerminal.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoWorker.ts`              |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-deno/src/DenoWorkerRunner.ts`        |            3 |           3 |             0 |                3 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/platform-node</code> (21 modules)</summary>

| Module                                                  | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/platform-node/src/Mime.ts`                    |            0 |           0 |             0 |                0 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeClusterHttp.ts`         |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeClusterSocket.ts`       |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeCrypto.ts`              |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeFileSystem.ts`          |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeHttpClient.ts`          |           18 |          18 |             0 |               18 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeHttpIncomingMessage.ts` |            1 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeHttpPlatform.ts`        |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeHttpServer.ts`          |            9 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeHttpServerRequest.ts`   |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeMultipart.ts`           |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node/src/NodePath.ts`                |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeRedis.ts`               |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeRuntime.ts`             |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeServices.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeSocket.ts`              |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeStdio.ts`               |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeTerminal.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeWorker.ts`              |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node/src/NodeWorkerRunner.ts`        |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node/src/Undici.ts`                  |            0 |           0 |             0 |                0 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/platform-node-shared</code> (12 modules)</summary>

| Module                                                         | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/platform-node-shared/src/NodeChildProcessSpawner.ts` |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeClusterSocket.ts`       |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeCrypto.ts`              |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeFileSystem.ts`          |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodePath.ts`                |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeRuntime.ts`             |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeSink.ts`                |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeSocket.ts`              |            6 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeSocketServer.ts`        |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeStdio.ts`               |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeStream.ts`              |           10 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/platform-node-shared/src/NodeTerminal.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-clickhouse</code> (2 modules)</summary>

| Module                                              | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| --------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/clickhouse/src/ClickhouseClient.ts`   |           11 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/sql/clickhouse/src/ClickhouseMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-d1</code> (1 modules)</summary>

| Module                            | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| --------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/d1/src/D1Client.ts` |            6 |          10 |             0 |               10 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-libsql</code> (2 modules)</summary>

| Module                                      | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/libsql/src/LibsqlClient.ts`   |            6 |          20 |             0 |               20 |         0 |              0 |           0 |
| `packages/sql/libsql/src/LibsqlMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-mssql</code> (4 modules)</summary>

| Module                                    | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ----------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/mssql/src/MssqlClient.ts`   |            8 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/sql/mssql/src/MssqlMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/sql/mssql/src/Parameter.ts`     |            3 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/sql/mssql/src/Procedure.ts`     |            8 |          12 |             0 |               12 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-mysql2</code> (2 modules)</summary>

| Module                                     | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------ | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/mysql2/src/MysqlClient.ts`   |            7 |          11 |             0 |               11 |         0 |              0 |           0 |
| `packages/sql/mysql2/src/MysqlMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-pg</code> (2 modules)</summary>

| Module                              | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ----------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/pg/src/PgClient.ts`   |           14 |          16 |             0 |               16 |         0 |              0 |           0 |
| `packages/sql/pg/src/PgMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-pglite</code> (2 modules)</summary>

| Module                                      | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/pglite/src/PgliteClient.ts`   |           10 |          17 |             0 |               17 |         0 |              0 |           0 |
| `packages/sql/pglite/src/PgliteMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-bun</code> (2 modules)</summary>

| Module                                          | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ----------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/sqlite-bun/src/SqliteClient.ts`   |            6 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/sql/sqlite-bun/src/SqliteMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-do</code> (2 modules)</summary>

| Module                                         | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ---------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/sqlite-do/src/SqliteClient.ts`   |            6 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/sql/sqlite-do/src/SqliteMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-node</code> (2 modules)</summary>

| Module                                           | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------ | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/sqlite-node/src/SqliteClient.ts`   |            7 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/sql/sqlite-node/src/SqliteMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-react-native</code> (2 modules)</summary>

| Module                                                   | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| -------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/sqlite-react-native/src/SqliteClient.ts`   |            8 |          11 |             0 |               11 |         0 |              0 |           0 |
| `packages/sql/sqlite-react-native/src/SqliteMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/sql-sqlite-wasm</code> (3 modules)</summary>

| Module                                           | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------------------------ | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/sql/sqlite-wasm/src/OpfsWorker.ts`     |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/sql/sqlite-wasm/src/SqliteClient.ts`   |           12 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/sql/sqlite-wasm/src/SqliteMigrator.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/utils</code> (3 modules)</summary>

| Module                                         | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ---------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/tools/utils/src/Codegen.ts`          |            4 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/tools/utils/src/commands/codegen.ts` |            1 |           0 |             0 |                0 |         0 |              0 |           1 |
| `packages/tools/utils/src/Glob.ts`             |            3 |           4 |             0 |                4 |         0 |              0 |           0 |

</details>

<details>
<summary><code>@effect/vitest</code> (2 modules)</summary>

| Module                         | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ------------------------------ | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/vitest/src/index.ts` |           11 |           0 |             0 |                0 |         0 |              0 |           4 |
| `packages/vitest/src/utils.ts` |           21 |          21 |             0 |               21 |         0 |              0 |           0 |

</details>

<details>
<summary><code>effect</code> (330 modules)</summary>

| Module                                                                  | Root exports | API records | With examples | Without examples | Type-only | Execution-only | Diagnostics |
| ----------------------------------------------------------------------- | -----------: | ----------: | ------------: | ---------------: | --------: | -------------: | ----------: |
| `packages/effect/src/Array.ts`                                          |          136 |         141 |           135 |                6 |         5 |              0 |           0 |
| `packages/effect/src/BigDecimal.ts`                                     |           45 |          45 |            43 |                2 |         0 |              0 |           0 |
| `packages/effect/src/BigInt.ts`                                         |           35 |          35 |            30 |                5 |         0 |              0 |           0 |
| `packages/effect/src/Boolean.ts`                                        |           17 |          17 |            15 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Brand.ts`                                          |            8 |          22 |             0 |               22 |         0 |              0 |           0 |
| `packages/effect/src/Cache.ts`                                          |           17 |          17 |            14 |                3 |         0 |              0 |           0 |
| `packages/effect/src/Cause.ts`                                          |           65 |          80 |            62 |               18 |         2 |              0 |           0 |
| `packages/effect/src/Channel.ts`                                        |          156 |         157 |            75 |               82 |         0 |              0 |           0 |
| `packages/effect/src/ChannelSchema.ts`                                  |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/Chunk.ts`                                          |           80 |          86 |            86 |                0 |         7 |              0 |           0 |
| `packages/effect/src/Clock.ts`                                          |            5 |          13 |             5 |                8 |         0 |              0 |           0 |
| `packages/effect/src/Combiner.ts`                                       |            9 |          10 |             9 |                1 |         0 |              0 |           0 |
| `packages/effect/src/Config.ts`                                         |           35 |          35 |            22 |               13 |         0 |              0 |           0 |
| `packages/effect/src/ConfigProvider.ts`                                 |           19 |          22 |            18 |                4 |         0 |              0 |           0 |
| `packages/effect/src/Console.ts`                                        |           20 |          21 |            20 |                1 |         0 |              0 |           0 |
| `packages/effect/src/Context.ts`                                        |           25 |          34 |            26 |                8 |         0 |              0 |           0 |
| `packages/effect/src/Cron.ts`                                           |           13 |          13 |            12 |                1 |         0 |              0 |           0 |
| `packages/effect/src/Crypto.ts`                                         |            3 |          16 |             3 |               13 |         0 |              0 |           0 |
| `packages/effect/src/Data.ts`                                           |            6 |          14 |            11 |                3 |         3 |              0 |           0 |
| `packages/effect/src/DateTime.ts`                                       |           92 |         108 |            82 |               26 |         0 |              3 |           0 |
| `packages/effect/src/Deferred.ts`                                       |           23 |          25 |            21 |                4 |         0 |              0 |           0 |
| `packages/effect/src/Differ.ts`                                         |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/Duration.ts`                                       |           57 |          57 |            50 |                7 |         0 |              0 |           0 |
| `packages/effect/src/Effect.ts`                                         |          241 |         261 |           204 |               57 |         0 |              1 |           0 |
| `packages/effect/src/Effectable.ts`                                     |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Encoding.ts`                                       |           12 |          14 |             9 |                5 |         0 |              0 |           0 |
| `packages/effect/src/Equal.ts`                                          |            7 |           7 |             7 |                0 |         0 |              0 |           0 |
| `packages/effect/src/Equivalence.ts`                                    |           17 |          17 |            17 |                0 |         1 |              0 |           0 |
| `packages/effect/src/ErrorReporter.ts`                                  |           13 |          17 |             6 |               11 |         0 |              0 |           0 |
| `packages/effect/src/ExecutionPlan.ts`                                  |            8 |          16 |             2 |               14 |         0 |              0 |           0 |
| `packages/effect/src/Exit.ts`                                           |           30 |          32 |            30 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Fiber.ts`                                          |           12 |          14 |            12 |                2 |         0 |              4 |           0 |
| `packages/effect/src/FiberHandle.ts`                                    |           15 |          15 |            15 |                0 |         0 |              0 |           0 |
| `packages/effect/src/FiberMap.ts`                                       |           19 |          19 |            19 |                0 |         0 |              0 |           0 |
| `packages/effect/src/FiberSet.ts`                                       |           14 |          14 |            14 |                0 |         0 |              0 |           0 |
| `packages/effect/src/FileSystem.ts`                                     |           19 |          59 |            16 |               43 |         0 |              0 |           0 |
| `packages/effect/src/Filter.ts`                                         |           30 |          30 |            11 |               19 |         0 |              0 |           0 |
| `packages/effect/src/Formatter.ts`                                      |            3 |           3 |             3 |                0 |         0 |              0 |           0 |
| `packages/effect/src/Function.ts`                                       |           24 |          24 |            22 |                2 |         1 |              2 |           0 |
| `packages/effect/src/Graph.ts`                                          |           93 |         106 |            65 |               41 |         0 |              0 |           0 |
| `packages/effect/src/Hash.ts`                                           |           12 |          12 |            11 |                1 |         0 |              0 |           0 |
| `packages/effect/src/HashMap.ts`                                        |           39 |          44 |            44 |                0 |         0 |              0 |           0 |
| `packages/effect/src/HashRing.ts`                                       |            9 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/effect/src/HashSet.ts`                                        |           19 |          21 |            21 |                0 |         0 |              0 |           0 |
| `packages/effect/src/HKT.ts`                                            |            4 |           4 |             4 |                0 |         4 |              0 |           0 |
| `packages/effect/src/Inspectable.ts`                                    |            6 |          10 |             5 |                5 |         0 |              0 |           0 |
| `packages/effect/src/Iterable.ts`                                       |           50 |          50 |            48 |                2 |         0 |              0 |           0 |
| `packages/effect/src/JsonPatch.ts`                                      |            4 |           7 |             4 |                3 |         0 |              0 |           0 |
| `packages/effect/src/JsonPointer.ts`                                    |            2 |           2 |             2 |                0 |         0 |              0 |           0 |
| `packages/effect/src/JsonSchema.ts`                                     |           16 |          16 |             9 |                7 |         0 |              0 |           0 |
| `packages/effect/src/Latch.ts`                                          |           11 |          19 |             3 |               16 |         0 |              0 |           0 |
| `packages/effect/src/Layer.ts`                                          |           55 |          56 |            37 |               19 |         0 |              0 |           0 |
| `packages/effect/src/LayerMap.ts`                                       |            5 |          20 |             4 |               16 |         0 |              0 |           0 |
| `packages/effect/src/LayerRef.ts`                                       |            4 |          15 |             2 |               13 |         0 |              0 |           0 |
| `packages/effect/src/Logger.ts`                                         |           23 |          23 |            22 |                1 |         0 |              1 |           0 |
| `packages/effect/src/LogLevel.ts`                                       |           11 |          11 |             8 |                3 |         0 |              0 |           0 |
| `packages/effect/src/ManagedRuntime.ts`                                 |            3 |          15 |             1 |               14 |         0 |              0 |           0 |
| `packages/effect/src/Match.ts`                                          |           45 |          59 |            54 |                5 |         8 |              2 |           0 |
| `packages/effect/src/Metric.ts`                                         |           42 |          52 |            51 |                1 |         0 |              0 |           0 |
| `packages/effect/src/MutableHashMap.ts`                                 |           17 |          17 |            14 |                3 |         0 |              0 |           0 |
| `packages/effect/src/MutableHashSet.ts`                                 |           10 |          10 |             9 |                1 |         0 |              0 |           0 |
| `packages/effect/src/MutableList.ts`                                    |           18 |          21 |            18 |                3 |         0 |              0 |           0 |
| `packages/effect/src/MutableRef.ts`                                     |           17 |          17 |            17 |                0 |         0 |              0 |           0 |
| `packages/effect/src/Newtype.ts`                                        |            7 |          11 |             7 |                4 |         0 |              0 |           0 |
| `packages/effect/src/NonEmptyIterable.ts`                               |            3 |           3 |             1 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Number.ts`                                         |           30 |          30 |            25 |                5 |         0 |              0 |           0 |
| `packages/effect/src/Optic.ts`                                          |           17 |          33 |            30 |                3 |         0 |              0 |           0 |
| `packages/effect/src/Option.ts`                                         |           67 |          69 |            61 |                8 |         1 |              0 |           0 |
| `packages/effect/src/Order.ts`                                          |           25 |          25 |            24 |                1 |         0 |              0 |           0 |
| `packages/effect/src/Ordering.ts`                                       |            4 |           4 |             3 |                1 |         0 |              0 |           0 |
| `packages/effect/src/PartitionedSemaphore.ts`                           |           12 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/Path.ts`                                           |            3 |           6 |             4 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Pipeable.ts`                                       |            6 |           6 |             2 |                4 |         0 |              0 |           0 |
| `packages/effect/src/PlatformError.ts`                                  |            6 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/effect/src/Pool.ts`                                           |           11 |          11 |             1 |               10 |         0 |              0 |           0 |
| `packages/effect/src/Predicate.ts`                                      |           50 |          57 |            57 |                0 |         0 |              0 |           0 |
| `packages/effect/src/PrimaryKey.ts`                                     |            4 |           4 |             2 |                2 |         0 |              0 |           0 |
| `packages/effect/src/PubSub.ts`                                         |           31 |          42 |            28 |               14 |         0 |              0 |           0 |
| `packages/effect/src/Pull.ts`                                           |           15 |          15 |             1 |               14 |         0 |              0 |           0 |
| `packages/effect/src/Queue.ts`                                          |           39 |          47 |            33 |               14 |         0 |              0 |           0 |
| `packages/effect/src/Random.ts`                                         |            9 |           9 |             9 |                0 |         0 |              0 |           0 |
| `packages/effect/src/RcMap.ts`                                          |            8 |          12 |             6 |                6 |         0 |              0 |           0 |
| `packages/effect/src/RcRef.ts`                                          |            4 |           6 |             4 |                2 |         1 |              0 |           0 |
| `packages/effect/src/Record.ts`                                         |           44 |          47 |            45 |                2 |         3 |              0 |           0 |
| `packages/effect/src/Redactable.ts`                                     |            5 |           5 |             2 |                3 |         0 |              0 |           0 |
| `packages/effect/src/Redacted.ts`                                       |            6 |           9 |             8 |                1 |         0 |              0 |           0 |
| `packages/effect/src/Reducer.ts`                                        |            3 |           5 |             3 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Ref.ts`                                            |           16 |          18 |            17 |                1 |         0 |              0 |           0 |
| `packages/effect/src/References.ts`                                     |           20 |          20 |             9 |               11 |         0 |              0 |           0 |
| `packages/effect/src/RegExp.ts`                                         |            3 |           3 |             3 |                0 |         0 |              0 |           0 |
| `packages/effect/src/Request.ts`                                        |           21 |          21 |            10 |               11 |         4 |              0 |           0 |
| `packages/effect/src/RequestResolver.ts`                                |           20 |          26 |            14 |               12 |         0 |              0 |           0 |
| `packages/effect/src/Resource.ts`                                       |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/Result.ts`                                         |           47 |          50 |            44 |                6 |         1 |              0 |           0 |
| `packages/effect/src/Runtime.ts`                                        |            7 |           9 |             5 |                4 |         0 |              0 |           0 |
| `packages/effect/src/Schedule.ts`                                       |           38 |          41 |            28 |               13 |         0 |              0 |           0 |
| `packages/effect/src/Scheduler.ts`                                      |            5 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/Schema.ts`                                         |          393 |         636 |            78 |              558 |        10 |              4 |           0 |
| `packages/effect/src/SchemaAST.ts`                                      |           81 |          87 |             9 |               78 |         0 |              0 |           0 |
| `packages/effect/src/SchemaError.ts`                                    |            2 |           2 |             1 |                1 |         0 |              0 |           0 |
| `packages/effect/src/SchemaGetter.ts`                                   |           52 |          52 |            51 |                1 |         0 |              0 |           0 |
| `packages/effect/src/SchemaIssue.ts`                                    |           22 |          48 |             9 |               39 |         0 |              0 |           0 |
| `packages/effect/src/SchemaParser.ts`                                   |           25 |          25 |             0 |               25 |         0 |              0 |           0 |
| `packages/effect/src/SchemaRepresentation.ts`                           |           64 |          72 |             1 |               71 |         0 |              0 |           0 |
| `packages/effect/src/SchemaTransformation.ts`                           |           44 |          44 |            38 |                6 |         0 |              2 |           0 |
| `packages/effect/src/Scope.ts`                                          |           13 |          17 |            15 |                2 |         0 |              0 |           0 |
| `packages/effect/src/ScopedCache.ts`                                    |           18 |          18 |             0 |               18 |         0 |              0 |           0 |
| `packages/effect/src/ScopedRef.ts`                                      |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/Semaphore.ts`                                      |           11 |          19 |             3 |               16 |         0 |              0 |           0 |
| `packages/effect/src/Sink.ts`                                           |           78 |          83 |            13 |               70 |         0 |              0 |           0 |
| `packages/effect/src/Stdio.ts`                                          |            4 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/Stream.ts`                                         |          243 |         244 |           226 |               18 |         0 |              0 |           0 |
| `packages/effect/src/String.ts`                                         |           64 |          64 |            55 |                9 |         0 |              0 |           0 |
| `packages/effect/src/Struct.ts`                                         |           23 |          23 |            23 |                0 |         4 |              0 |           0 |
| `packages/effect/src/SubscriptionRef.ts`                                |           25 |          27 |            22 |                5 |         0 |              0 |           0 |
| `packages/effect/src/Symbol.ts`                                         |            1 |           1 |             1 |                0 |         0 |              0 |           0 |
| `packages/effect/src/SynchronizedRef.ts`                                |           24 |          24 |             0 |               24 |         0 |              0 |           0 |
| `packages/effect/src/Take.ts`                                           |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Terminal.ts`                                       |            6 |          19 |             0 |               19 |         0 |              0 |           0 |
| `packages/effect/src/testing/TestClock.ts`                              |            7 |          14 |             9 |                5 |         0 |              0 |           0 |
| `packages/effect/src/testing/TestConsole.ts`                            |            6 |          11 |             8 |                3 |         0 |              0 |           0 |
| `packages/effect/src/testing/TestSchema.ts`                             |            3 |          15 |            13 |                2 |         0 |              0 |           0 |
| `packages/effect/src/Tracer.ts`                                         |           20 |          21 |            12 |                9 |         0 |              0 |           0 |
| `packages/effect/src/Trie.ts`                                           |           29 |          29 |            29 |                0 |         0 |              0 |           0 |
| `packages/effect/src/Tuple.ts`                                          |           17 |          17 |            17 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxChunk.ts`                                        |           22 |          22 |            22 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxDeferred.ts`                                     |            8 |           8 |             7 |                1 |         0 |              0 |           0 |
| `packages/effect/src/TxHashMap.ts`                                      |           37 |          41 |            41 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxHashSet.ts`                                      |           22 |          24 |            24 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxPriorityQueue.ts`                                |           19 |          19 |            19 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxPubSub.ts`                                       |           18 |          18 |            16 |                2 |         0 |              0 |           0 |
| `packages/effect/src/TxQueue.ts`                                        |           34 |          40 |            33 |                7 |         0 |              0 |           0 |
| `packages/effect/src/TxReentrantLock.ts`                                |           17 |          17 |            17 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxRef.ts`                                          |            7 |           7 |             7 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxSemaphore.ts`                                    |           14 |          14 |            14 |                0 |         0 |              0 |           0 |
| `packages/effect/src/TxSubscriptionRef.ts`                              |           12 |          12 |            12 |                0 |         0 |              0 |           0 |
| `packages/effect/src/Types.ts`                                          |           32 |          38 |            31 |                7 |        31 |              0 |           0 |
| `packages/effect/src/UndefinedOr.ts`                                    |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/Unify.ts`                                          |            5 |           8 |             2 |                6 |         1 |              0 |           0 |
| `packages/effect/src/unstable/ai/AiError.ts`                            |           38 |          81 |            27 |               54 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/AnthropicStructuredOutput.ts`          |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Chat.ts`                               |           11 |          23 |            11 |               12 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/EmbeddingModel.ts`                     |           10 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/IdGenerator.ts`                        |            6 |          10 |             6 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/LanguageModel.ts`                      |           19 |          44 |             6 |               38 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/McpProtocol.ts`                        |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/McpSchema.ts`                          |          116 |         123 |             0 |              123 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/McpServer.ts`                          |           15 |          17 |             1 |               16 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Model.ts`                              |            4 |           6 |             1 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/OpenAiStructuredOutput.ts`             |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Prompt.ts`                             |           78 |         151 |            22 |              129 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Response.ts`                           |           86 |         211 |            13 |              198 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/ResponseIdTracker.ts`                  |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Telemetry.ts`                          |           17 |          36 |             6 |               30 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Tokenizer.ts`                          |            3 |           5 |             3 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Tool.ts`                               |           55 |          91 |            18 |               73 |         0 |              0 |           0 |
| `packages/effect/src/unstable/ai/Toolkit.ts`                            |           14 |          22 |             3 |               19 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Argument.ts`                          |           33 |          33 |            32 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/CliConfig.ts`                         |            4 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/CliError.ts`                          |           12 |          28 |            10 |               18 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/CliOutput.ts`                         |            3 |           9 |             9 |                0 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Command.ts`                           |           26 |          45 |            14 |               31 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Completions.ts`                       |            7 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Flag.ts`                              |           36 |          36 |            34 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/GlobalFlag.ts`                        |           13 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/HelpDoc.ts`                           |            6 |          32 |             4 |               28 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Param.ts`                             |           56 |          60 |            36 |               24 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Primitive.ts`                         |           18 |          20 |            16 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cli/Prompt.ts`                            |           40 |         102 |             2 |              100 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ClusterCron.ts`                   |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ClusterError.ts`                  |            7 |          21 |             0 |               21 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ClusterMetrics.ts`                |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ClusterSchema.ts`                 |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts`         |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/DeliverAt.ts`                     |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Entity.ts`                        |           14 |          29 |             0 |               29 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/EntityAddress.ts`                 |            2 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/EntityId.ts`                      |            2 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/EntityProxy.ts`                   |            4 |           4 |             2 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/EntityProxyServer.ts`             |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/EntityResource.ts`                |            5 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/EntityType.ts`                    |            2 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Envelope.ts`                      |           18 |          29 |             0 |               29 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/HttpRunner.ts`                    |           13 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/K8sHttpClient.ts`                 |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/MachineId.ts`                     |            2 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Message.ts`                       |           13 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/MessageStorage.ts`                |           14 |          34 |             0 |               34 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Reply.ts`                         |           10 |          26 |             0 |               26 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Runner.ts`                        |            2 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/RunnerAddress.ts`                 |            2 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/RunnerHealth.ts`                  |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Runners.ts`                       |           10 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/RunnerServer.ts`                  |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/RunnerStorage.ts`                 |            5 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ShardId.ts`                       |            6 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Sharding.ts`                      |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ShardingConfig.ts`                |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts`     |            6 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/SingleRunner.ts`                  |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Singleton.ts`                     |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/SingletonAddress.ts`              |            1 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/Snowflake.ts`                     |           14 |          21 |             0 |               21 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/SocketRunner.ts`                  |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/SqlMessageStorage.ts`             |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/SqlRunnerStorage.ts`              |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/cluster/TestRunner.ts`                    |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/devtools/DevTools.ts`                     |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/devtools/DevToolsClient.ts`               |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/devtools/DevToolsSchema.ts`               |           20 |          44 |             0 |               44 |         0 |              0 |           0 |
| `packages/effect/src/unstable/devtools/DevToolsServer.ts`               |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/encoding/Msgpack.ts`                      |            9 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/effect/src/unstable/encoding/Ndjson.ts`                       |           13 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/effect/src/unstable/encoding/Sse.ts`                          |           19 |          27 |             0 |               27 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/Event.ts`                        |           28 |          29 |             0 |               29 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventGroup.ts`                   |           10 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventJournal.ts`                 |           16 |          28 |             0 |               28 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLog.ts`                     |           22 |          31 |             0 |               31 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogEncryption.ts`           |            5 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogMessage.ts`              |           16 |          20 |             0 |               20 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogRemote.ts`               |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogServer.ts`               |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogServerEncrypted.ts`      |            6 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts`    |           16 |          16 |             0 |               16 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts`          |           15 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/SqlEventJournal.ts`              |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts`   |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.ts` |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/Cookies.ts`                          |           33 |          38 |             0 |               38 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/Etag.ts`                             |            7 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/FetchHttpClient.ts`                  |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/Headers.ts`                          |           18 |          20 |             0 |               20 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpBody.ts`                         |           24 |          28 |             0 |               28 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpClient.ts`                       |           41 |          56 |             0 |               56 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpClientError.ts`                  |           12 |          28 |             0 |               28 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpClientRequest.ts`                |           49 |          51 |             0 |               51 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpClientResponse.ts`               |           12 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpEffect.ts`                       |           12 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpIncomingMessage.ts`              |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpMethod.ts`                       |            5 |           8 |             1 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpMiddleware.ts`                   |           11 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpPlatform.ts`                     |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpRouter.ts`                       |           29 |          40 |             5 |               35 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpServer.ts`                       |           14 |          14 |             0 |               14 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpServerError.ts`                  |           13 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpServerRequest.ts`                |           20 |          21 |             0 |               21 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpServerRespondable.ts`            |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpServerResponse.ts`               |           36 |          39 |             0 |               39 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpStaticServer.ts`                 |            2 |           2 |             2 |                0 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/HttpTraceContext.ts`                 |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/Multipart.ts`                        |           27 |          35 |             0 |               35 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/Template.ts`                         |            6 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/Url.ts`                              |           17 |          17 |             5 |               12 |         0 |              0 |           0 |
| `packages/effect/src/unstable/http/UrlParams.ts`                        |           24 |          27 |             3 |               24 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApi.ts`                       |            7 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts`                |            6 |          14 |             0 |               14 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiClient.ts`                 |            8 |          14 |             1 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts`               |           57 |          61 |             0 |               61 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiError.ts`                  |           28 |          29 |             0 |               29 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiGroup.ts`                  |           20 |          28 |             0 |               28 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts`             |           21 |          21 |             1 |               20 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiScalar.ts`                 |            4 |          21 |             0 |               21 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiSchema.ts`                 |           24 |          34 |             0 |               34 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts`               |           11 |          14 |             0 |               14 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiSwagger.ts`                |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/HttpApiTest.ts`                   |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/httpapi/OpenApi.ts`                       |           38 |          39 |             0 |               39 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/Otlp.ts`                    |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/OtlpExporter.ts`            |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/OtlpLogger.ts`              |            4 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/OtlpMetrics.ts`             |            5 |           5 |             1 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/OtlpResource.ts`            |           12 |          25 |             0 |               25 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/OtlpSerialization.ts`       |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/OtlpTracer.ts`              |            6 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/observability/PrometheusMetrics.ts`       |            6 |           9 |             3 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/KeyValueStore.ts`             |           14 |          46 |             0 |               46 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/Persistable.ts`               |           15 |          15 |             0 |               15 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/PersistedCache.ts`            |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/PersistedQueue.ts`            |           14 |          19 |             0 |               19 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/Persistence.ts`               |           17 |          18 |             0 |               18 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/RateLimiter.ts`               |           21 |          43 |             2 |               41 |         0 |              0 |           0 |
| `packages/effect/src/unstable/persistence/Redis.ts`                     |            5 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/process/ChildProcess.ts`                  |           28 |          50 |             7 |               43 |         0 |              0 |           0 |
| `packages/effect/src/unstable/process/ChildProcessSpawner.ts`           |            7 |          20 |             1 |               19 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/AsyncResult.ts`                |           42 |          48 |             0 |               48 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/Atom.ts`                       |           71 |          77 |             1 |               76 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/AtomHttpApi.ts`                |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/AtomRef.ts`                    |            6 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/AtomRegistry.ts`               |           11 |          13 |             0 |               13 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/AtomRpc.ts`                    |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/Hydration.ts`                  |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/reactivity/Reactivity.ts`                 |            7 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/Rpc.ts`                               |           49 |          60 |             1 |               59 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcClient.ts`                         |           14 |          18 |             0 |               18 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcClientError.ts`                    |            2 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcGroup.ts`                          |            8 |          21 |             0 |               21 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcMessage.ts`                        |           30 |          33 |             0 |               33 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcMiddleware.ts`                     |           19 |          20 |             0 |               20 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcSchema.ts`                         |            3 |           4 |             0 |                4 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcSerialization.ts`                  |           18 |          19 |             0 |               19 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcServer.ts`                         |           20 |          21 |             0 |               21 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcTest.ts`                           |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/RpcWorker.ts`                         |            4 |           6 |             0 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/rpc/Utils.ts`                             |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/schema/Model.ts`                          |           38 |          55 |             1 |               54 |         0 |              0 |           0 |
| `packages/effect/src/unstable/schema/VariantSchema.ts`                  |           13 |          25 |             0 |               25 |         0 |              0 |           0 |
| `packages/effect/src/unstable/socket/Socket.ts`                         |           30 |          41 |             0 |               41 |         0 |              0 |           0 |
| `packages/effect/src/unstable/socket/SocketServer.ts`                   |            9 |          12 |             0 |               12 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/Migrator.ts`                          |           10 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlClient.ts`                         |            5 |          17 |             0 |               17 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlConnection.ts`                     |            3 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlError.ts`                          |           17 |          45 |             0 |               45 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlModel.ts`                          |            2 |           2 |             0 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlResolver.ts`                       |            6 |           7 |             0 |                7 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlSchema.ts`                         |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/SqlStream.ts`                         |            1 |           1 |             0 |                1 |         0 |              0 |           0 |
| `packages/effect/src/unstable/sql/Statement.ts`                         |           41 |          47 |             0 |               47 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workers/Transferable.ts`                  |           10 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workers/Worker.ts`                        |            8 |           9 |             0 |                9 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workers/WorkerError.ts`                   |            8 |          10 |             0 |               10 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workers/WorkerRunner.ts`                  |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/Activity.ts`                     |            8 |           8 |             0 |                8 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/DurableClock.ts`                 |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/DurableDeferred.ts`              |           17 |          23 |             0 |               23 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/DurableQueue.ts`                 |            6 |           7 |             1 |                6 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/Workflow.ts`                     |           25 |          39 |             0 |               39 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/WorkflowEngine.ts`               |            5 |           5 |             0 |                5 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/WorkflowProxy.ts`                |            4 |           4 |             2 |                2 |         0 |              0 |           0 |
| `packages/effect/src/unstable/workflow/WorkflowProxyServer.ts`          |            3 |           3 |             0 |                3 |         0 |              0 |           0 |
| `packages/effect/src/Utils.ts`                                          |            3 |           5 |             3 |                2 |         0 |              0 |           0 |

</details>
