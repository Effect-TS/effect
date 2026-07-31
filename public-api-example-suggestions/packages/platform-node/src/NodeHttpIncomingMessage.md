# Example Suggestions: `@effect/platform-node/NodeHttpIncomingMessage`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeHttpIncomingMessage.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                            | Line | Kind               | Priority        |
| ---------------------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeHttpIncomingMessage.NodeHttpIncomingMessage`                        |   41 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpIncomingMessage.NodeHttpIncomingMessage.IncomingMessage.TypeId` |   49 | `member`           | **discouraged** |

## Recommended

### `@effect/platform-node/NodeHttpIncomingMessage.NodeHttpIncomingMessage`

- **Source:** `packages/platform-node/src/NodeHttpIncomingMessage.ts:41`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Adapts a Node `IncomingMessage` to Effect HTTP incoming messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpIncomingMessage } from "@effect/platform-node"` and use `NodeHttpIncomingMessage.NodeHttpIncomingMessage`.
- **Suggested snippet:** Use `NodeHttpIncomingMessage.NodeHttpIncomingMessage` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `@effect/platform-node/NodeHttpIncomingMessage.NodeHttpIncomingMessage.IncomingMessage.TypeId`

- **Source:** `packages/platform-node/src/NodeHttpIncomingMessage.ts:49`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an HTTP incoming message for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/platform-node/NodeHttpIncomingMessage.NodeHttpIncomingMessage.IncomingMessage.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
