# Example Suggestions: `@effect/jsdocs/Jsdocs`

- **Package:** `@effect/jsdocs`
- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts`
- **Uncovered API records:** 44
- **Priorities:** 0 required, 3 recommended, 41 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/jsdocs/Jsdocs.findLeadingJSDoc`           |  891 | `root-declaration` | **recommended** |
| `@effect/jsdocs/Jsdocs.extractJSDocs`              | 3466 | `root-declaration` | **recommended** |
| `@effect/jsdocs/Jsdocs.readJSDocModel`             | 3487 | `root-declaration` | **recommended** |
| `@effect/jsdocs/Jsdocs.createJSDocFileMatcher`     |  523 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.getSourceText`              |  842 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.getCwd`                     |  854 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.getProgram`                 | 1596 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocConfig`                | 1852 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ExtractJSDocsOptions`       | 1865 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.computeJSDocInputHash`      | 1882 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.loadJSDocConfig`            | 3367 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.extractJSDocsSync`          | 3379 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.writeJSDocModel`            | 3475 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.sourceHash`                 | 3506 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocResult`                |   31 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocDiagnostic`            |   39 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocParseError`            |   50 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedSeeTag`               |   60 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedInlineLinkSymbol`     |   71 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedInlineLink`           |   82 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedDescription`          |   96 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedExample`              |  109 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedModuleJSDoc`          |  121 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedDeclarationTags`      |  138 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedNamespaceTags`        |  151 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedMemberTags`           |  164 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedMember`               |  177 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedRootDeclaration`      |  193 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedNamespaceDeclaration` |  210 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedNamespace`            |  226 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedJSDocFile`            |  243 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedJSDocBarrelImport`    |  255 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedJSDocImports`         |  272 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApiKind`               |  284 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApiImportGuidance`     |  292 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApiSeeLinkResolution`  |  315 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApiSeeLink`            |  333 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApiSeeTag`             |  343 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApiTags`               |  354 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocApi`                   |  367 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.ParsedJSDocFileDumpEntry`   |  405 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocModelDiagnostic`       | 1814 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocModelFile`             | 1824 | `root-declaration` | **optional**    |
| `@effect/jsdocs/Jsdocs.JSDocModel`                 | 1837 | `root-declaration` | **optional**    |

## Recommended

### `@effect/jsdocs/Jsdocs.findLeadingJSDoc`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:891`
- **Kind / category:** `root-declaration` / `parsing`
- **Priority:** **recommended**
- **Current description:** Finds the JSDoc block immediately preceding an AST node.
- **Signature hint:** `declare function findLeadingJSDoc(source: string, node: AstNode, ignoredRange?: [number, number]): JSDocBlock | undefined`
- **Import guidance:** Start from `import { findLeadingJSDoc } from "@effect/jsdocs/Jsdocs"` and use `findLeadingJSDoc`.
- **Suggested snippet:** Create a small representative input, call `findLeadingJSDoc`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/jsdocs/Jsdocs.extractJSDocs`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:3466`
- **Kind / category:** `root-declaration` / `extraction`
- **Priority:** **recommended**
- **Current description:** Extracts a complete JSDoc model in `Effect`.
- **Signature hint:** `declare function extractJSDocs(options: ExtractJSDocsOptions): Effect.Effect<JSDocModel>`
- **Import guidance:** Start from `import { extractJSDocs } from "@effect/jsdocs/Jsdocs"` and use `extractJSDocs`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `extractJSDocs`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/jsdocs/Jsdocs.readJSDocModel`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:3487`
- **Kind / category:** `root-declaration` / `persistence`
- **Priority:** **recommended**
- **Current description:** Reads and validates the outer structure of a persisted JSDoc model.
- **Signature hint:** `declare function readJSDocModel(filename: string): Result<JSDocModel, string>`
- **Import guidance:** Start from `import { readJSDocModel } from "@effect/jsdocs/Jsdocs"` and use `readJSDocModel`.
- **Suggested snippet:** Call `readJSDocModel` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/jsdocs/Jsdocs.createJSDocFileMatcher`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:523`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a predicate that checks whether a filename is included by the configured JSDoc globs.
- **Signature hint:** `declare function createJSDocFileMatcher(options: { readonly cwd: string; readonly include?: ReadonlyArray<string>; readonly exclude?: ReadonlyArray<string>; }): (filename: string) => boolean`
- **Import guidance:** Start from `import { createJSDocFileMatcher } from "@effect/jsdocs/Jsdocs"` and use `createJSDocFileMatcher`.
- **Suggested snippet:** Construct one representative value with `createJSDocFileMatcher`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.getSourceText`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:842`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Reads source text from an Oxlint-compatible rule context.
- **Signature hint:** `declare function getSourceText(context: { readonly sourceCode: { readonly text?: string; getText(node?: unknown): string; }; }): string`
- **Import guidance:** Start from `import { getSourceText } from "@effect/jsdocs/Jsdocs"` and use `getSourceText`.
- **Suggested snippet:** Create a small representative input, call `getSourceText`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.getCwd`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:854`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Resolves the working directory from an Oxlint-compatible rule context.
- **Signature hint:** `declare function getCwd(context: { readonly cwd?: string; getCwd?: () => string; }): string`
- **Import guidance:** Start from `import { getCwd } from "@effect/jsdocs/Jsdocs"` and use `getCwd`.
- **Suggested snippet:** Create a small representative input, call `getCwd`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.getProgram`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1596`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Loads and caches the TypeScript program for a project configuration.
- **Signature hint:** `declare function getProgram(tsconfigPath: string): ProgramCacheEntry`
- **Import guidance:** Start from `import { getProgram } from "@effect/jsdocs/Jsdocs"` and use `getProgram`.
- **Suggested snippet:** Create a small representative input, call `getProgram`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocConfig`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1852`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** File selection and output configuration for JSDoc extraction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ExtractJSDocsOptions`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1865`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** JSDoc extraction configuration with an optional working directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ExtractJSDocsOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.computeJSDocInputHash`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1882`
- **Kind / category:** `root-declaration` / `hashing`
- **Priority:** **optional**
- **Current description:** Computes the cache key for the configured JSDoc extraction inputs.
- **Signature hint:** `declare function computeJSDocInputHash(options: ExtractJSDocsOptions): string`
- **Import guidance:** Start from `import { computeJSDocInputHash } from "@effect/jsdocs/Jsdocs"` and use `computeJSDocInputHash`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Computes the cache key for the configured JSDoc extraction inputs. Call `computeJSDocInputHash` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.loadJSDocConfig`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:3367`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Loads a JSDoc extraction configuration from JSON.
- **Signature hint:** `declare function loadJSDocConfig(cwd?: string, configPath?: string): JSDocConfig`
- **Import guidance:** Start from `import { loadJSDocConfig } from "@effect/jsdocs/Jsdocs"` and use `loadJSDocConfig`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Loads a JSDoc extraction configuration from JSON. Call `loadJSDocConfig` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.extractJSDocsSync`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:3379`
- **Kind / category:** `root-declaration` / `extraction`
- **Priority:** **optional**
- **Current description:** Extracts a complete JSDoc model synchronously.
- **Signature hint:** `declare function extractJSDocsSync(options: ExtractJSDocsOptions): JSDocModel`
- **Import guidance:** Start from `import { extractJSDocsSync } from "@effect/jsdocs/Jsdocs"` and use `extractJSDocsSync`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts a complete JSDoc model synchronously. Call `extractJSDocsSync` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.writeJSDocModel`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:3475`
- **Kind / category:** `root-declaration` / `persistence`
- **Priority:** **optional**
- **Current description:** Writes a JSDoc model as formatted JSON.
- **Signature hint:** `declare function writeJSDocModel(cwd: string, output: string, model: JSDocModel): void`
- **Import guidance:** Start from `import { writeJSDocModel } from "@effect/jsdocs/Jsdocs"` and use `writeJSDocModel`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Writes a JSDoc model as formatted JSON. Call `writeJSDocModel` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.sourceHash`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:3506`
- **Kind / category:** `root-declaration` / `hashing`
- **Priority:** **optional**
- **Current description:** Computes the content hash stored for a source file in a JSDoc model.
- **Signature hint:** `declare function sourceHash(source: string): string`
- **Import guidance:** Start from `import { sourceHash } from "@effect/jsdocs/Jsdocs"` and use `sourceHash`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Computes the content hash stored for a source file in a JSDoc model. Call `sourceHash` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocResult`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:31`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Result type returned by the JSDoc parser helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocDiagnostic`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:39`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Diagnostic emitted when a JSDoc block does not follow the standard shape.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocDiagnostic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocParseError`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parse error containing all diagnostics collected for a JSDoc block or file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocParseError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedSeeTag`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:60`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed `@see` tag text and any inline links it contains.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedSeeTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedInlineLinkSymbol`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** TypeScript symbol target resolved for a parsed inline JSDoc link.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedInlineLinkSymbol`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedInlineLink`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:82`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed inline JSDoc link target and optional display text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedInlineLink`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedDescription`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:96`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed JSDoc description sections.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedDescription`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedExample`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:109`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed example section from a JSDoc block.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedExample`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedModuleJSDoc`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:121`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Raw module-level JSDoc block collected from the top of a checked file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedModuleJSDoc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedDeclarationTags`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:138`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed tags required for a root public declaration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedDeclarationTags`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedNamespaceTags`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:151`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed tags allowed for namespace JSDoc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedNamespaceTags`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedMemberTags`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:164`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed tags allowed for documented members.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedMemberTags`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedMember`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:177`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed documented member within a declaration or another member.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedMember`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedRootDeclaration`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:193`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed root declaration exported from a checked file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedRootDeclaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedNamespaceDeclaration`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:210`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed type declaration exported from inside a namespace.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedNamespaceDeclaration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedNamespace`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:226`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed namespace and its documented exported type declarations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedNamespace`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedJSDocFile`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:243`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed public JSDoc data collected from one checked file.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedJSDocFile`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedJSDocBarrelImport`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:255`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Barrel import metadata for a public module included in the JSDoc dump.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedJSDocBarrelImport`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedJSDocImports`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:272`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Import specifiers for a public module included in the JSDoc dump.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedJSDocImports`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApiKind`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:284`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Kinds of public API records represented in a JSDoc model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApiKind`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApiImportGuidance`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:292`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Recommended import declaration and usage for an importable API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApiImportGuidance`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApiSeeLinkResolution`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:315`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Resolution result for a link in an API's `@see` tags.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApiSeeLinkResolution`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApiSeeLink`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:333`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed `@see` link paired with its public API resolution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApiSeeLink`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApiSeeTag`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:343`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed `@see` tag and its resolved links.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApiSeeTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApiTags`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:354`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Standard tags attached to a public API record.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApiTags`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocApi`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:367`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** One public API record in an extracted JSDoc model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocApi`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.ParsedJSDocFileDumpEntry`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:405`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed public JSDoc data paired with the normalized source file path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.ParsedJSDocFileDumpEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocModelDiagnostic`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1814`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** JSDoc diagnostic paired with its source range.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocModelDiagnostic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocModelFile`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1824`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed JSDoc and diagnostics for one source file in a model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocModelFile`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/jsdocs/Jsdocs.JSDocModel`

- **Source:** `packages/tools/jsdocs/src/Jsdocs.ts:1837`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Versioned output of a repository JSDoc extraction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/jsdocs/Jsdocs.JSDocModel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
