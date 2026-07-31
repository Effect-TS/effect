# Example Suggestions: `@effect/platform-deno/DenoHttpServerRequest`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoHttpServerRequest.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                               | Line | Kind               | Priority        |
| ----------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoHttpServerRequest.toDenoServerRequest` |   18 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoHttpServerRequest.toDenoServerRequest`

- **Source:** `packages/platform-deno/src/DenoHttpServerRequest.ts:18`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Returns the underlying web-standard `Request` from an Effect `HttpServerRequest`.
- **Signature hint:** `declare function toDenoServerRequest(self: HttpServerRequest): Request`
- **Import guidance:** Start from `import { DenoHttpServerRequest } from "@effect/platform-deno"` and use `DenoHttpServerRequest.toDenoServerRequest`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `DenoHttpServerRequest.toDenoServerRequest`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
