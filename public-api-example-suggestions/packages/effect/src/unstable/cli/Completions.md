# Example Suggestions: `effect/unstable/cli/Completions`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/Completions.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 0 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority     |
| ---------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/cli/Completions.generate`           |  110 | `root-declaration` | **optional** |
| `effect/unstable/cli/Completions.Shell`              |   19 | `root-declaration` | **optional** |
| `effect/unstable/cli/Completions.CommandDescriptor`  |   27 | `root-declaration` | **optional** |
| `effect/unstable/cli/Completions.FlagDescriptor`     |   41 | `root-declaration` | **optional** |
| `effect/unstable/cli/Completions.FlagType`           |   54 | `root-declaration` | **optional** |
| `effect/unstable/cli/Completions.ArgumentDescriptor` |   69 | `root-declaration` | **optional** |
| `effect/unstable/cli/Completions.ArgumentType`       |   83 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/cli/Completions.generate`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:110`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Generates a shell completion script for a command descriptor.
- **Signature hint:** `declare function generate(executableName: string, shell: Shell, descriptor: CommandDescriptor): string`
- **Import guidance:** Start from `import { Completions } from "effect/unstable/cli"` and use `Completions.generate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Generates a shell completion script for a command descriptor. Call `Completions.generate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Completions.Shell`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:19`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Shell type used to generate completion scripts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Completions.Shell`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Completions.CommandDescriptor`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:27`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes a command for completion script generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Completions.CommandDescriptor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Completions.FlagDescriptor`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes a command flag for completions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Completions.FlagDescriptor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Completions.FlagType`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes the supported flag value shapes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Completions.FlagType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Completions.ArgumentDescriptor`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:69`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes a positional argument for completions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Completions.ArgumentDescriptor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Completions.ArgumentType`

- **Source:** `packages/effect/src/unstable/cli/Completions.ts:83`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes the supported argument value shapes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Completions.ArgumentType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
