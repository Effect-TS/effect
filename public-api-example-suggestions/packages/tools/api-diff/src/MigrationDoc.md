# Example Suggestions: `@effect/api-diff/MigrationDoc`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 0 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority     |
| -------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/api-diff/MigrationDoc.extractImportMapSections` |  259 | `unmodeled-export` | **optional** |
| `@effect/api-diff/MigrationDoc.renderMigrationDocument`  |  272 | `unmodeled-export` | **optional** |
| `@effect/api-diff/MigrationDoc.markdownSafetyIssues`     |  342 | `unmodeled-export` | **optional** |
| `@effect/api-diff/MigrationDoc.unannotatedApiIds`        |  399 | `unmodeled-export` | **optional** |
| `@effect/api-diff/MigrationDoc.unannotatedModuleIds`     |  419 | `unmodeled-export` | **optional** |
| `@effect/api-diff/MigrationDoc.renderMissingAnnotations` |  432 | `unmodeled-export` | **optional** |

## Optional

### `@effect/api-diff/MigrationDoc.extractImportMapSections`

- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts:259`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const extractImportMapSections = (document: string): string => { const start = document.indexOf("## Import Map") if (start === -1) { return "## Import Map\n\nNo import map is available.\n" } const apiRenames = document.indexOf("\n## API Renames", start) const removedModules = document.indexOf("\n## Removed Modules", start) const apiReference = document.indexOf("\n## API Reference", start) const ends = [apiRenames, removedModules, apiReference].filter((index) => index !== -1) const end = e`
- **Import guidance:** Start from `import { extractImportMapSections } from "@effect/api-diff/MigrationDoc"` and use `extractImportMapSections`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `extractImportMapSections` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/MigrationDoc.renderMigrationDocument`

- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts:272`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const renderMigrationDocument = ( diff: ApiDiff, annotations: ReadonlyMap<string, MigrationAnnotation>, importMapSections: string ): string => { const entries = migrationEntries(diff, annotations, importMapSections) const replacements = importMapReplacements(importMapSections) const modulesRemoved = removedModules(diff) const modules = new Map<string, Array<MigrationEntry>>() for (const entry of entries) { const group = modules.get(entry.module) if (group === undefined) { modules.set(entr`
- **Import guidance:** Start from `import { renderMigrationDocument } from "@effect/api-diff/MigrationDoc"` and use `renderMigrationDocument`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `renderMigrationDocument` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/MigrationDoc.markdownSafetyIssues`

- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts:342`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const markdownSafetyIssues = (document: string): ReadonlyArray<string> => { const issues: Array<string> = [] let fence: string | undefined const lines = document.split("\n") for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) { const line = lines[lineIndex]! const fenceMatch = /^\s*('{3,})(?:[^']*)$/.exec(line) if (fence !== undefined) { if (line.trim() === fence) { fence = undefined } continue } if (fenceMatch !== null) { fence = fenceMatch[1]! continue } if ( line === "<!-- d`
- **Import guidance:** Start from `import { markdownSafetyIssues } from "@effect/api-diff/MigrationDoc"` and use `markdownSafetyIssues`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `markdownSafetyIssues` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/MigrationDoc.unannotatedApiIds`

- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts:399`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const unannotatedApiIds = ( diff: ApiDiff, annotations: ReadonlyMap<string, MigrationAnnotation>, importMapSections = "" ): ReadonlyMap<string, ReadonlyArray<string>> => { const modules = new Map<string, Array<string>>() for (const entry of migrationEntries(diff, annotations, importMapSections)) { if (annotations.has(entry.id)) { continue } const ids = modules.get(entry.module) if (ids === undefined) { modules.set(entry.module, [entry.id]) } else { ids.push(entry.id) } } return modules }`
- **Import guidance:** Start from `import { unannotatedApiIds } from "@effect/api-diff/MigrationDoc"` and use `unannotatedApiIds`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `unannotatedApiIds` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/MigrationDoc.unannotatedModuleIds`

- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts:419`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const unannotatedModuleIds = ( diff: ApiDiff, annotations: ReadonlyMap<string, MigrationAnnotation>, importMapSections: string ): ReadonlyArray<string> => { const replacements = importMapReplacements(importMapSections) return removedModules(diff).filter((module) => !annotations.has(module) && !replacements.has(module) && ![...annotations.keys()].some((id) => id.startsWith('${module}#')) ) }`
- **Import guidance:** Start from `import { unannotatedModuleIds } from "@effect/api-diff/MigrationDoc"` and use `unannotatedModuleIds`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `unannotatedModuleIds` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/MigrationDoc.renderMissingAnnotations`

- **Source:** `packages/tools/api-diff/src/MigrationDoc.ts:432`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const renderMissingAnnotations = ( diff: ApiDiff, annotations: ReadonlyMap<string, MigrationAnnotation>, importMapSections = "" ): string => { const missingApis = unannotatedApiIds(diff, annotations, importMapSections) const missingModules = unannotatedModuleIds(diff, annotations, importMapSections) if (missingApis.size === 0 && missingModules.length === 0) { return "All migration APIs and removed modules have guidance.\n" } return '${ [ ...(missingModules.length === 0 ? [] : ["Removed mo`
- **Import guidance:** Start from `import { renderMissingAnnotations } from "@effect/api-diff/MigrationDoc"` and use `renderMissingAnnotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `renderMissingAnnotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
