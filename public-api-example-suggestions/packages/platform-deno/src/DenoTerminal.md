# Example Suggestions: `@effect/platform-deno/DenoTerminal`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoTerminal.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind               | Priority        |
| ------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoTerminal.make`  |   23 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoTerminal.layer` |   32 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoTerminal.make`

- **Source:** `packages/platform-deno/src/DenoTerminal.ts:23`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped `Terminal` service backed by process stdin/stdout, using the optional predicate to decide when key input should end the input stream.
- **Signature hint:** `declare function make(shouldQuit?: (input: UserInput) => boolean): Effect<Terminal, never, Scope>`
- **Import guidance:** Start from `import { DenoTerminal } from "@effect/platform-deno"` and use `DenoTerminal.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoTerminal.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoTerminal.layer`

- **Source:** `packages/platform-deno/src/DenoTerminal.ts:32`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the default process-backed `Terminal` service, ending key input on the default quit keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoTerminal } from "@effect/platform-deno"` and use `DenoTerminal.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoTerminal.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
