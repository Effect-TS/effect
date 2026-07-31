# Example Suggestions: `effect/unstable/ai/McpProtocol`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/McpProtocol.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 2 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/ai/McpProtocol.ProtocolAdapter` |   34 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpProtocol.ProtocolVersion` |   48 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpProtocol.v2025_06_18`     |   16 | `root-declaration` | **discouraged** |

## Optional

### `effect/unstable/ai/McpProtocol.ProtocolAdapter`

- **Source:** `packages/effect/src/unstable/ai/McpProtocol.ts:34`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An implemented MCP protocol that can be supplied to `McpServer`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpProtocol.ProtocolAdapter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpProtocol.ProtocolVersion`

- **Source:** `packages/effect/src/unstable/ai/McpProtocol.ts:48`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The MCP protocol versions implemented by this release.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpProtocol.ProtocolVersion`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/ai/McpProtocol.v2025_06_18`

- **Source:** `packages/effect/src/unstable/ai/McpProtocol.ts:16`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** The MCP 2025-06-18 protocol implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpProtocol } from "effect/unstable/ai"` and use `McpProtocol.v2025_06_18`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `McpProtocol.v2025_06_18` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
