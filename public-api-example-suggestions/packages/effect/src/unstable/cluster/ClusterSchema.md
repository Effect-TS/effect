# Example Suggestions: `effect/unstable/cluster/ClusterSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 0 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority     |
| ------------------------------------------------------------------ | ---: | ------------------ | ------------ |
| `effect/unstable/cluster/ClusterSchema.Persisted`                  |   26 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.WithTransaction`            |   52 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.Uninterruptible`            |   70 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.isUninterruptibleForServer` |   89 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.isUninterruptibleForClient` |  114 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.ShardGroup`                 |  129 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.ClientTracingEnabled`       |  145 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ClusterSchema.Dynamic`                    |  165 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/cluster/ClusterSchema.Persisted`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:26`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation that marks whether a cluster request should be persisted in mailbox storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.Persisted`.
- **Suggested snippet:** Consume `ClusterSchema.Persisted` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.WithTransaction`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:52`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation that marks whether request handling should be wrapped in the configured message storage transaction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.WithTransaction`.
- **Suggested snippet:** Consume `ClusterSchema.WithTransaction` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.Uninterruptible`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:70`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation that controls whether a cluster request is treated as uninterruptible.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.Uninterruptible`.
- **Suggested snippet:** Consume `ClusterSchema.Uninterruptible` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.isUninterruptibleForServer`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:89`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns whether the `Uninterruptible` annotation applies to server-side request handling for the provided context.
- **Signature hint:** `declare function isUninterruptibleForServer(context: Context.Context<never>): boolean`
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.isUninterruptibleForServer`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `ClusterSchema.isUninterruptibleForServer`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.isUninterruptibleForClient`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:114`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Returns whether the `Uninterruptible` annotation applies to client-side request handling for the provided context.
- **Signature hint:** `declare function isUninterruptibleForClient(context: Context.Context<never>): boolean`
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.isUninterruptibleForClient`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `ClusterSchema.isUninterruptibleForClient`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.ShardGroup`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:129`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation that selects the shard group for an entity id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.ShardGroup`.
- **Suggested snippet:** Consume `ClusterSchema.ShardGroup` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.ClientTracingEnabled`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:145`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation that controls whether client-side cluster request tracing is enabled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.ClientTracingEnabled`.
- **Suggested snippet:** Consume `ClusterSchema.ClientTracingEnabled` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ClusterSchema.Dynamic`

- **Source:** `packages/effect/src/unstable/cluster/ClusterSchema.ts:165`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Context reference for deriving request annotations from a cluster request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClusterSchema } from "effect/unstable/cluster"` and use `ClusterSchema.Dynamic`.
- **Suggested snippet:** Consume `ClusterSchema.Dynamic` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
