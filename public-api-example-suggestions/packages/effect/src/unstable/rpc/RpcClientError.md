# Example Suggestions: `effect/unstable/rpc/RpcClientError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcClientError.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcClientError.RpcClientDefect`       |   25 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcClientError.RpcClientError`        |   38 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcClientError.RpcClientError.TypeId` |   52 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/rpc/RpcClientError.RpcClientDefect`

- **Source:** `packages/effect/src/unstable/rpc/RpcClientError.ts:25`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Represents a client-side RPC defect, such as a protocol violation or decoding failure, with a message and original cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcClientError } from "effect/unstable/rpc"` and use `RpcClientError.RpcClientDefect`.
- **Suggested snippet:** Create or capture `RpcClientError.RpcClientDefect` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcClientError.RpcClientError`

- **Source:** `packages/effect/src/unstable/rpc/RpcClientError.ts:38`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error wrapper for RPC client failures, including worker, socket, HTTP client, and client protocol defect failures.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcClientError } from "effect/unstable/rpc"` and use `RpcClientError.RpcClientError`.
- **Suggested snippet:** Create or capture `RpcClientError.RpcClientError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/unstable/rpc/RpcClientError.RpcClientError.TypeId`

- **Source:** `packages/effect/src/unstable/rpc/RpcClientError.ts:52`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an RPC client error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/rpc/RpcClientError.RpcClientError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
