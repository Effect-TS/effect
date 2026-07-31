# Example Suggestions: `@effect/api-diff/Json`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Json.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 1 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind               | Priority        |
| ----------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Json.decodeJson`  |    4 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Json.stableJson`  |    6 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Json.fingerprint` |   24 | `unmodeled-export` | **optional**    |
| `@effect/api-diff/Json.prettyJson`  |   26 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/Json.decodeJson`

- **Source:** `packages/tools/api-diff/src/Json.ts:4`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))`
- **Import guidance:** Start from `import { decodeJson } from "@effect/api-diff/Json"` and use `decodeJson`.
- **Suggested snippet:** Convert one representative external input with `decodeJson` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/Json.stableJson`

- **Source:** `packages/tools/api-diff/src/Json.ts:6`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const stableJson = (value: unknown): string => { const visit = (input: unknown): unknown => { if (Array.isArray(input)) { return input.map(visit) } if (input !== null && typeof input === "object") { return Object.fromEntries( Object.entries(input) .filter(([, entry]) => entry !== undefined) .sort(([left], [right]) => left.localeCompare(right)) .map(([key, entry]) => [key, visit(entry)]) ) } return input } return JSON.stringify(visit(value)) }`
- **Import guidance:** Start from `import { stableJson } from "@effect/api-diff/Json"` and use `stableJson`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `stableJson` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Json.fingerprint`

- **Source:** `packages/tools/api-diff/src/Json.ts:24`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const fingerprint = (value: unknown): string => createHash("sha256").update(stableJson(value)).digest("hex")`
- **Import guidance:** Start from `import { fingerprint } from "@effect/api-diff/Json"` and use `fingerprint`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `fingerprint` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/api-diff/Json.prettyJson`

- **Source:** `packages/tools/api-diff/src/Json.ts:26`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const prettyJson = (value: unknown): string => '${JSON.stringify(value, null, 2)}\n'`
- **Import guidance:** Start from `import { prettyJson } from "@effect/api-diff/Json"` and use `prettyJson`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `prettyJson` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
