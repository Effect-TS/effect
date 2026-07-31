# Example Suggestions: `@effect/platform-bun/BunTerminal`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunTerminal.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunTerminal.make`  |   23 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunTerminal.layer` |   32 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunTerminal.make`

- **Source:** `packages/platform-bun/src/BunTerminal.ts:23`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped `Terminal` service backed by process stdin/stdout, using the optional predicate to decide when key input should end the input stream.
- **Signature hint:** `declare function make(shouldQuit?: (input: UserInput) => boolean): Effect<Terminal, never, Scope>`
- **Import guidance:** Start from `import { BunTerminal } from "@effect/platform-bun"` and use `BunTerminal.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `BunTerminal.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunTerminal.layer`

- **Source:** `packages/platform-bun/src/BunTerminal.ts:32`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the default process-backed `Terminal` service, ending key input on the default quit keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunTerminal } from "@effect/platform-bun"` and use `BunTerminal.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunTerminal.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
