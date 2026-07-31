# Example Suggestions: `effect/Fiber`

- **Package:** `effect`
- **Source:** `packages/effect/src/Fiber.ts`
- **Uncovered API records:** 2
- **Priorities:** 1 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                    | Line | Kind               | Priority        |
| ---------------------- | ---: | ------------------ | --------------- |
| `effect/Fiber.runIn`   |  592 | `root-declaration` | **required**    |
| `effect/Fiber.joinAll` |  305 | `root-declaration` | **recommended** |

## Required

### `effect/Fiber.runIn`

- **Source:** `packages/effect/src/Fiber.ts:592`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Adds a fiber to a `Scope` and returns the same fiber.
- **Signature hint:** `declare function runIn(scope: Scope): <A, E>(self: Fiber<A, E>) => Fiber<A, E> declare function runIn<A, E>(self: Fiber<A, E>, scope: Scope): Fiber<A, E>`
- **Import guidance:** Start from `import { Fiber } from "effect"` and use `Fiber.runIn`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a fiber to a `Scope` and returns the same fiber. Call `Fiber.runIn` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/Fiber.joinAll`

- **Source:** `packages/effect/src/Fiber.ts:305`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Waits for all fibers to succeed and returns their values in input order.
- **Signature hint:** `declare function joinAll<A extends Iterable<Fiber<any, any>>>(self: A): Effect<Arr.ReadonlyArray.With<A, A extends Iterable<Fiber<infer _A, infer _E>> ? _A : never>, A extends Fiber<infer _A, infer _E> ? _E : never>`
- **Import guidance:** Start from `import { Fiber } from "effect"` and use `Fiber.joinAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Fiber.joinAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
