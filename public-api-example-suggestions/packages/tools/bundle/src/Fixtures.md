# Example Suggestions: `@effect/bundle/Fixtures`

- **Package:** `@effect/bundle`
- **Source:** `packages/tools/bundle/src/Fixtures.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                | Line | Kind               | Priority        |
| ---------------------------------- | ---: | ------------------ | --------------- |
| `@effect/bundle/Fixtures.Fixtures` |   32 | `root-declaration` | **recommended** |

## Recommended

### `@effect/bundle/Fixtures.Fixtures`

- **Source:** `packages/tools/bundle/src/Fixtures.ts:32`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service that discovers and sorts TypeScript fixture files used by the bundle size tooling.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Fixtures } from "@effect/bundle/Fixtures"` and use `Fixtures`.
- **Suggested snippet:** Consume `Fixtures` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
