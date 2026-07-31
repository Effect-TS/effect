# Example Suggestions: `effect/unstable/cluster/ShardId`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 4 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/ShardId.isShardId`         |   38 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardId.ShardId (value)`   |   47 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardId.fromStringEncoded` |  148 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardId.fromString`        |  175 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardId.make`              |   90 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/ShardId.toString`          |  131 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/ShardId.ShardId (type)`    |   26 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/ShardId.isShardId`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:38`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the value carries the `ShardId` runtime marker.
- **Signature hint:** `declare function isShardId(u: unknown): u is ShardId`
- **Import guidance:** Start from `import { ShardId } from "effect/unstable/cluster"` and use `ShardId.isShardId`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `ShardId.isShardId` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardId.ShardId (value)`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:47`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for shard identifiers encoded as `{ group, id }` objects and decoded via `make`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ShardId } from "effect/unstable/cluster"` and use `ShardId.ShardId`.
- **Suggested snippet:** Use `ShardId.ShardId` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardId.fromStringEncoded`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:148`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Parses a `group:id` string into plain shard id parts.
- **Signature hint:** `declare function fromStringEncoded(s: string): { readonly group: string; readonly id: number; }`
- **Import guidance:** Start from `import { ShardId } from "effect/unstable/cluster"` and use `ShardId.fromStringEncoded`.
- **Suggested snippet:** Convert one representative external input with `ShardId.fromStringEncoded` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardId.fromString`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:175`
- **Kind / category:** `root-declaration` / `decoding`
- **Priority:** **recommended**
- **Current description:** Parses a `group:id` string into a cached `ShardId`.
- **Signature hint:** `declare function fromString(s: string): ShardId`
- **Import guidance:** Start from `import { ShardId } from "effect/unstable/cluster"` and use `ShardId.fromString`.
- **Suggested snippet:** Convert one representative external input with `ShardId.fromString` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/ShardId.make`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:90`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates or reuses the cached `ShardId` for the specified shard group and numeric id.
- **Signature hint:** `declare function make(group: string, id: number): ShardId`
- **Import guidance:** Start from `import { ShardId } from "effect/unstable/cluster"` and use `ShardId.make`.
- **Suggested snippet:** Construct one representative value with `ShardId.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardId.toString`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:131`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Formats a shard identifier as `group:id`.
- **Signature hint:** `declare function toString(shardId: { readonly group: string; readonly id: number; }): string`
- **Import guidance:** Start from `import { ShardId } from "effect/unstable/cluster"` and use `ShardId.toString`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `ShardId.toString`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardId.ShardId (type)`

- **Source:** `packages/effect/src/unstable/cluster/ShardId.ts:26`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Identifier for a shard within a shard group, with equality, hashing, and primary key behavior based on the `group:id` string form.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/ShardId.ShardId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
