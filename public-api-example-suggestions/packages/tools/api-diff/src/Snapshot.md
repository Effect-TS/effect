# Example Suggestions: `@effect/api-diff/Snapshot`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Snapshot.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Snapshot.Snapshotter`             |  847 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Snapshot.SnapshotExtractionError` |  704 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Snapshot.serializeType`           |  219 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Snapshot.snapshotCacheKey`        |  842 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Snapshot.ExtractSnapshotOptions`  |  697 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/Snapshot.Snapshotter`

- **Source:** `packages/tools/api-diff/src/Snapshot.ts:847`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export class Snapshotter extends Context.Service<Snapshotter, { readonly extract: (options: ExtractSnapshotOptions) => Effect.Effect< ApiSnapshot, ApiDiffError | SnapshotExtractionError > }>()("@effect/api-diff/Snapshotter") { static readonly layerNoDependencies = Layer.effect( Snapshotter, Effect.gen(function*() { const discovery = yield* Discovery const path = yield* Path.Path const extract = Effect.fnUntraced(function*(options: ExtractSnapshotOptions) { const discovered = yield* discovery.dis`
- **Import guidance:** Start from `import { Snapshotter } from "@effect/api-diff/Snapshot"` and use `Snapshotter`.
- **Suggested snippet:** Consume `Snapshotter` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/api-diff/Snapshot.SnapshotExtractionError`

- **Source:** `packages/tools/api-diff/src/Snapshot.ts:704`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export class SnapshotExtractionError extends Schema.TaggedErrorClass<SnapshotExtractionError>()( "SnapshotExtractionError", { message: Schema.String, diagnostics: Schema.Array(SnapshotDiagnosticSchema) } ) {}`
- **Import guidance:** Start from `import { SnapshotExtractionError } from "@effect/api-diff/Snapshot"` and use `SnapshotExtractionError`.
- **Suggested snippet:** Create or capture `SnapshotExtractionError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/Snapshot.serializeType`

- **Source:** `packages/tools/api-diff/src/Snapshot.ts:219`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const serializeType = (node: ts.TypeNode, context: SerializationContext): TypeModel => { const primitive = primitiveKinds.get(node.kind) if (primitive !== undefined) { return { kind: "primitive", name: primitive } } if (ts.isParenthesizedTypeNode(node)) { return serializeType(node.type, context) } if (ts.isLiteralTypeNode(node)) { const literal = node.literal return { kind: "literal", value: literal.kind === ts.SyntaxKind.TrueKeyword ? true : literal.kind === ts.SyntaxKind.FalseKeyword ?`
- **Import guidance:** Start from `import { serializeType } from "@effect/api-diff/Snapshot"` and use `serializeType`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `serializeType` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Snapshot.snapshotCacheKey`

- **Source:** `packages/tools/api-diff/src/Snapshot.ts:842`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const snapshotCacheKey = ( sha: string, modules?: ReadonlyArray<string> ): string => fingerprint(["snapshot-v4", sha, ts.version, modules === undefined ? "all" : [...modules].sort()])`
- **Import guidance:** Start from `import { snapshotCacheKey } from "@effect/api-diff/Snapshot"` and use `snapshotCacheKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `snapshotCacheKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Snapshot.ExtractSnapshotOptions`

- **Source:** `packages/tools/api-diff/src/Snapshot.ts:697`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ExtractSnapshotOptions { readonly repoRoot: string readonly ref: string readonly sha: string readonly modules?: ReadonlyArray<string> }`
- **Import guidance:** Start from `import { ExtractSnapshotOptions } from "@effect/api-diff/Snapshot"` and use `ExtractSnapshotOptions`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ExtractSnapshotOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
