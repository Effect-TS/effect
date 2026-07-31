# Example Suggestions: `effect/unstable/cli/Flag`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/Flag.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               | Line | Kind               | Priority     |
| --------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/cli/Flag.choice` |  178 | `root-declaration` | **optional** |
| `effect/unstable/cli/Flag.Flag`   |   35 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/cli/Flag.choice`

- **Source:** `packages/effect/src/unstable/cli/Flag.ts:178`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a flag that accepts one of the provided string choices and returns the selected string.
- **Signature hint:** `declare function choice<const Choices extends ReadonlyArray<string>>(name: string, choices: Choices): Flag<Choices[number]>`
- **Import guidance:** Start from `import { Flag } from "effect/unstable/cli"` and use `Flag.choice`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a flag that accepts one of the provided string choices and returns the selected string. Call `Flag.choice` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Flag.Flag`

- **Source:** `packages/effect/src/unstable/cli/Flag.ts:35`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a command-line flag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Flag.Flag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
