# Example Suggestions: `effect/unstable/devtools/DevToolsServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/devtools/DevToolsServer.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/devtools/DevToolsServer.run`    |   52 | `root-declaration` | **recommended** |
| `effect/unstable/devtools/DevToolsServer.Client` |   35 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/devtools/DevToolsServer.run`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsServer.ts:52`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs the devtools socket server.
- **Signature hint:** `declare function run<_, E, R>(handle: (client: Client) => Effect.Effect<_, E, R>): Effect.Effect<never, SocketServer.SocketServerError, R | SocketServer.SocketServer>`
- **Import guidance:** Start from `import { DevToolsServer } from "effect/unstable/devtools"` and use `DevToolsServer.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DevToolsServer.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/devtools/DevToolsServer.Client`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsServer.ts:35`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Handle for a connected devtools client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsServer.Client`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
