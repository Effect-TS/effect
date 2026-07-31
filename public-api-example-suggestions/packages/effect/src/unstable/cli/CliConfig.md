# Example Suggestions: `effect/unstable/cli/CliConfig`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 2 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind                    | Priority        |
| ---------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cli/CliConfig.layer`                      |   84 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/CliConfig.make`                       |   67 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/CliConfig.CliConfig (value)`          |   22 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/CliConfig.defaults`                   |   50 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/CliConfig.CliConfig (type)`           |   31 | `namespace`             | **optional**    |
| `effect/unstable/cli/CliConfig.CliConfig.Service`          |   38 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/CliConfig.CliConfig.Service.builtIns` |   40 | `member`                | **optional**    |

## Recommended

### `effect/unstable/cli/CliConfig.layer`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:84`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that provides CLI configuration merged over `defaults`.
- **Signature hint:** `declare function layer(options?: Partial<CliConfig.Service>): Layer.Layer<never>`
- **Import guidance:** Start from `import { CliConfig } from "effect/unstable/cli"` and use `CliConfig.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `CliConfig.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/CliConfig.make`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:67`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates CLI configuration by merging the provided options over `defaults`.
- **Signature hint:** `declare function make(options?: Partial<CliConfig.Service>): CliConfig.Service`
- **Import guidance:** Start from `import { CliConfig } from "effect/unstable/cli"` and use `CliConfig.make`.
- **Suggested snippet:** Construct one representative value with `CliConfig.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cli/CliConfig.CliConfig (value)`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:22`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Context reference for configuration shared by CLI parsing, help generation, and command execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { CliConfig } from "effect/unstable/cli"` and use `CliConfig.CliConfig`.
- **Suggested snippet:** Consume `CliConfig.CliConfig` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliConfig.defaults`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:50`
- **Kind / category:** `root-declaration` / `defaults`
- **Priority:** **optional**
- **Current description:** Default CLI configuration containing every built-in global flag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { CliConfig } from "effect/unstable/cli"` and use `CliConfig.defaults`.
- **Suggested snippet:** Use `CliConfig.defaults` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliConfig.CliConfig (type)`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:31`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types used by the `CliConfig` context reference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/CliConfig.CliConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliConfig.CliConfig.Service`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:38`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration values used while running a CLI command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/CliConfig.CliConfig.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliConfig.CliConfig.Service.builtIns`

- **Source:** `packages/effect/src/unstable/cli/CliConfig.ts:40`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Ordered built-in global flags, with earlier action flags taking precedence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliConfig.CliConfig.Service.builtIns` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
