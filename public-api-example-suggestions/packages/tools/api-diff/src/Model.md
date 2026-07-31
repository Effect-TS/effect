# Example Suggestions: `@effect/api-diff/Model`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Model.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 3 recommended, 12 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                           | Line | Kind               | Priority        |
| --------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Model.Bucket`               |    3 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Model.SourceLocation`       |    7 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Model.SnapshotDiagnostic`   |   83 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Model.Documentation`        |   15 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.TypeModel`            |   23 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.DeclarationModel`     |   28 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.TypeParameterModel`   |   42 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ParameterModel`       |   49 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ImportRoute`          |   57 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ApiEntity`            |   62 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.Entrypoint`           |   77 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ApiSnapshot`          |   93 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ChangeClassification` |  107 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ApiChange`            |  136 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Model.ApiDiff`              |  151 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/Model.Bucket`

- **Source:** `packages/tools/api-diff/src/Model.ts:3`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const Bucket = Schema.Literals(["type", "value"])`
- **Import guidance:** Start from `import { Bucket } from "@effect/api-diff/Model"` and use `Bucket`.
- **Suggested snippet:** Use `Bucket` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/api-diff/Model.SourceLocation`

- **Source:** `packages/tools/api-diff/src/Model.ts:7`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const SourceLocation = Schema.Struct({ file: Schema.String, line: Schema.Number, column: Schema.Number })`
- **Import guidance:** Start from `import { SourceLocation } from "@effect/api-diff/Model"` and use `SourceLocation`.
- **Suggested snippet:** Use `SourceLocation` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/api-diff/Model.SnapshotDiagnostic`

- **Source:** `packages/tools/api-diff/src/Model.ts:83`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const SnapshotDiagnostic = Schema.Struct({ code: Schema.String, message: Schema.String, module: Schema.optional(Schema.String), path: Schema.optional(Schema.Array(Schema.String)), source: Schema.optional(SourceLocation) })`
- **Import guidance:** Start from `import { SnapshotDiagnostic } from "@effect/api-diff/Model"` and use `SnapshotDiagnostic`.
- **Suggested snippet:** Use `SnapshotDiagnostic` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/Model.Documentation`

- **Source:** `packages/tools/api-diff/src/Model.ts:15`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface Documentation { readonly summary?: string | undefined readonly deprecated?: string | undefined readonly since?: string | undefined readonly category?: string | undefined readonly stability?: "stable" | "unstable" | undefined }`
- **Import guidance:** Start from `import { Documentation } from "@effect/api-diff/Model"` and use `Documentation`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Documentation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.TypeModel`

- **Source:** `packages/tools/api-diff/src/Model.ts:23`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface TypeModel { readonly kind: string readonly [key: string]: unknown }`
- **Import guidance:** Start from `import { TypeModel } from "@effect/api-diff/Model"` and use `TypeModel`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `TypeModel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.DeclarationModel`

- **Source:** `packages/tools/api-diff/src/Model.ts:28`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface DeclarationModel { readonly kind: string readonly name: string readonly typeParameters?: ReadonlyArray<TypeParameterModel> | undefined readonly parameters?: ReadonlyArray<ParameterModel> | undefined readonly returnType?: TypeModel | undefined readonly type?: TypeModel | undefined readonly members?: ReadonlyArray<DeclarationModel> | undefined readonly overloads?: ReadonlyArray<DeclarationModel> | undefined readonly heritage?: ReadonlyArray<TypeModel> | undefined readonly modifier`
- **Import guidance:** Start from `import { DeclarationModel } from "@effect/api-diff/Model"` and use `DeclarationModel`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `DeclarationModel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.TypeParameterModel`

- **Source:** `packages/tools/api-diff/src/Model.ts:42`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface TypeParameterModel { readonly id: string readonly displayName: string readonly constraint?: TypeModel | undefined readonly default?: TypeModel | undefined }`
- **Import guidance:** Start from `import { TypeParameterModel } from "@effect/api-diff/Model"` and use `TypeParameterModel`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `TypeParameterModel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ParameterModel`

- **Source:** `packages/tools/api-diff/src/Model.ts:49`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ParameterModel { readonly name: string readonly type: TypeModel readonly optional: boolean readonly rest: boolean readonly modifiers?: ReadonlyArray<string> | undefined }`
- **Import guidance:** Start from `import { ParameterModel } from "@effect/api-diff/Model"` and use `ParameterModel`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ParameterModel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ImportRoute`

- **Source:** `packages/tools/api-diff/src/Model.ts:57`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ImportRoute { readonly module: string readonly path: ReadonlyArray<string> }`
- **Import guidance:** Start from `import { ImportRoute } from "@effect/api-diff/Model"` and use `ImportRoute`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ImportRoute`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ApiEntity`

- **Source:** `packages/tools/api-diff/src/Model.ts:62`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ApiEntity { readonly id: string readonly packageName: string readonly module: string readonly path: ReadonlyArray<string> readonly bucket: Bucket readonly declarationKind: string readonly importRoutes: ReadonlyArray<ImportRoute> readonly declarations: ReadonlyArray<DeclarationModel> readonly displaySignature: string readonly fingerprint: string readonly documentation: Documentation readonly source: SourceLocation }`
- **Import guidance:** Start from `import { ApiEntity } from "@effect/api-diff/Model"` and use `ApiEntity`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ApiEntity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.Entrypoint`

- **Source:** `packages/tools/api-diff/src/Model.ts:77`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface Entrypoint { readonly packageName: string readonly module: string readonly declarationFile: string }`
- **Import guidance:** Start from `import { Entrypoint } from "@effect/api-diff/Model"` and use `Entrypoint`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Entrypoint`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ApiSnapshot`

- **Source:** `packages/tools/api-diff/src/Model.ts:93`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ApiSnapshot { readonly version: 1 readonly compiler: { readonly name: "typescript" readonly version: string } readonly ref: string readonly sha: string readonly packages: ReadonlyArray<string> readonly entrypoints: ReadonlyArray<Entrypoint> readonly entities: ReadonlyArray<ApiEntity> readonly diagnostics: ReadonlyArray<SnapshotDiagnostic> }`
- **Import guidance:** Start from `import { ApiSnapshot } from "@effect/api-diff/Model"` and use `ApiSnapshot`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ApiSnapshot`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ChangeClassification`

- **Source:** `packages/tools/api-diff/src/Model.ts:107`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export type ChangeClassification = | "package-added" | "package-removed" | "module-added" | "module-removed" | "api-added" | "api-removed" | "api-moved" | "api-renamed" | "bucket-changed" | "declaration-kind-changed" | "overload-added" | "overload-removed" | "overload-reordered" | "parameter-added" | "parameter-removed" | "parameter-reordered" | "parameter-changed" | "return-type-changed" | "generic-parameter-changed" | "member-added" | "member-removed" | "member-changed" | "heritage-changed" |`
- **Import guidance:** Start from `import { ChangeClassification } from "@effect/api-diff/Model"` and use `ChangeClassification`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ChangeClassification`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ApiChange`

- **Source:** `packages/tools/api-diff/src/Model.ts:136`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ApiChange { readonly id: string readonly classification: ChangeClassification readonly confidence: number readonly baseApiId?: string | undefined readonly headApiId?: string | undefined readonly before?: string | undefined readonly after?: string | undefined readonly delta?: unknown readonly baseSource?: SourceLocation | undefined readonly headSource?: SourceLocation | undefined readonly reviewNotes?: string | undefined readonly authoritative: boolean }`
- **Import guidance:** Start from `import { ApiChange } from "@effect/api-diff/Model"` and use `ApiChange`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ApiChange`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Model.ApiDiff`

- **Source:** `packages/tools/api-diff/src/Model.ts:151`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ApiDiff { readonly version: 1 readonly base: { readonly ref: string; readonly sha: string } readonly head: { readonly ref: string; readonly sha: string } readonly changes: ReadonlyArray<ApiChange> }`
- **Import guidance:** Start from `import { ApiDiff } from "@effect/api-diff/Model"` and use `ApiDiff`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ApiDiff`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
