# Example Suggestions: `@effect/doctest/Protocol`

- **Package:** `@effect/doctest`
- **Source:** `packages/tools/doctest/src/Protocol.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 0 recommended, 4 optional, 5 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind               | Priority        |
| ------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/doctest/Protocol.collectorPrefix` |   11 | `root-declaration` | **optional**    |
| `@effect/doctest/Protocol.snippetPrefix`   |   19 | `root-declaration` | **optional**    |
| `@effect/doctest/Protocol.resolvedMarker`  |   27 | `root-declaration` | **optional**    |
| `@effect/doctest/Protocol.Request`         |   35 | `root-declaration` | **optional**    |
| `@effect/doctest/Protocol.request`         |   47 | `root-declaration` | **discouraged** |
| `@effect/doctest/Protocol.resolvedRequest` |   70 | `root-declaration` | **discouraged** |
| `@effect/doctest/Protocol.resolvedId`      |  104 | `root-declaration` | **discouraged** |
| `@effect/doctest/Protocol.collectorId`     |  123 | `root-declaration` | **discouraged** |
| `@effect/doctest/Protocol.snippetId`       |  138 | `root-declaration` | **discouraged** |

## Optional

### `@effect/doctest/Protocol.collectorPrefix`

- **Source:** `packages/tools/doctest/src/Protocol.ts:11`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Prefix for virtual doctest collector module requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.collectorPrefix`.
- **Suggested snippet:** Use `Protocol.collectorPrefix` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/doctest/Protocol.snippetPrefix`

- **Source:** `packages/tools/doctest/src/Protocol.ts:19`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Prefix for virtual doctest snippet module requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.snippetPrefix`.
- **Suggested snippet:** Use `Protocol.snippetPrefix` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/doctest/Protocol.resolvedMarker`

- **Source:** `packages/tools/doctest/src/Protocol.ts:27`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Query parameter used to identify resolved doctest modules.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.resolvedMarker`.
- **Suggested snippet:** Use `Protocol.resolvedMarker` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/doctest/Protocol.Request`

- **Source:** `packages/tools/doctest/src/Protocol.ts:35`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes a virtual doctest module request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/doctest/Protocol.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/doctest/Protocol.request`

- **Source:** `packages/tools/doctest/src/Protocol.ts:47`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Parses a virtual doctest request with the specified prefix.
- **Signature hint:** `declare function request(prefix: string, id: string): Request | undefined`
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.request`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Protocol.request` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/doctest/Protocol.resolvedRequest`

- **Source:** `packages/tools/doctest/src/Protocol.ts:70`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Parses the identifier of a resolved doctest module.
- **Signature hint:** `declare function resolvedRequest(id: string): (Request & { readonly kind: 'collector' | 'snippet'; }) | undefined`
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.resolvedRequest`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Protocol.resolvedRequest` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/doctest/Protocol.resolvedId`

- **Source:** `packages/tools/doctest/src/Protocol.ts:104`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates the identifier of a resolved doctest module.
- **Signature hint:** `declare function resolvedId(kind: 'collector' | 'snippet', value: Request): string`
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.resolvedId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Protocol.resolvedId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/doctest/Protocol.collectorId`

- **Source:** `packages/tools/doctest/src/Protocol.ts:123`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a virtual doctest collector module identifier.
- **Signature hint:** `declare function collectorId(file: string, version?: string | undefined): string`
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.collectorId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Protocol.collectorId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/doctest/Protocol.snippetId`

- **Source:** `packages/tools/doctest/src/Protocol.ts:138`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a virtual doctest snippet module identifier.
- **Signature hint:** `declare function snippetId(file: string, index: number, version?: string | undefined): string`
- **Import guidance:** Start from `import { Protocol } from "@effect/doctest"` and use `Protocol.snippetId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Protocol.snippetId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
