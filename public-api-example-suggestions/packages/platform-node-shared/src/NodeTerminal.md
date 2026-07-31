# Example Suggestions: `@effect/platform-node-shared/NodeTerminal`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeTerminal.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                               | Line | Kind               | Priority        |
| ------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeTerminal.make`  |   32 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeTerminal.layer` |  173 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeTerminal.make`

- **Source:** `packages/platform-node-shared/src/NodeTerminal.ts:32`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped process-backed `Terminal` using Node `readline`, enabling TTY raw mode while in scope and using the supplied predicate to decide when key input should end.
- **Signature hint:** `declare function make(shouldQuit?: (input: Terminal.UserInput) => boolean): Effect.Effect<Terminal.Terminal, never, Scope.Scope>`
- **Import guidance:** Start from `import { NodeTerminal } from "@effect/platform-node-shared"` and use `NodeTerminal.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeTerminal.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeTerminal.layer`

- **Source:** `packages/platform-node-shared/src/NodeTerminal.ts:173`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the default process-backed `Terminal` service, ending key input on Ctrl+C or Ctrl+D.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeTerminal } from "@effect/platform-node-shared"` and use `NodeTerminal.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeTerminal.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
