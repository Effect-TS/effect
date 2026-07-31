# Example Suggestions: `effect/unstable/cli/GlobalFlag`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 1 recommended, 14 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind                    | Priority        |
| ------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/unstable/cli/GlobalFlag.action`                |  104 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/GlobalFlag.setting`               |  122 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Help`                  |  155 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Version`               |  177 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Wizard`                |  199 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Completions`           |  218 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.LogLevel`              |  246 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.BuiltIns`              |  298 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.HandlerContext`        |   36 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Action`                |   49 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Setting (type) (type)` |   64 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.Setting (type) (type)` |   75 | `namespace`             | **optional**    |
| `effect/unstable/cli/GlobalFlag.Setting.Identifier`    |   83 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/GlobalFlag.GlobalFlag`            |   92 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/GlobalFlag.BuiltIn`               |  312 | `root-declaration`      | **optional**    |

## Recommended

### `effect/unstable/cli/GlobalFlag.action`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:104`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Action flag that performs a side effect and exits.
- **Signature hint:** `declare function action<A>(options: { readonly flag: Flag.Flag<A>; readonly run: (value: A, context: HandlerContext) => Effect.Effect<void>; }): Action<A>`
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.action`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an Action flag that performs a side effect and exits. Call `GlobalFlag.action` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cli/GlobalFlag.setting`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:122`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a Setting flag that configures the command handler's environment.
- **Signature hint:** `declare function setting<const Id extends string>(id: Id): <A>(options: { readonly flag: Flag.Flag<A>; }) => Setting<Id, A>`
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.setting`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a Setting flag that configures the command handler's environment. Call `GlobalFlag.setting` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Help`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:155`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Defines the `--help` / `-h` global flag, which shows help documentation for the active command path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.Help`.
- **Suggested snippet:** Use `GlobalFlag.Help` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Version`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:177`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Defines the global action flag for showing command version information.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.Version`.
- **Suggested snippet:** Use `GlobalFlag.Version` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Wizard`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:199`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Defines the global action flag for starting interactive wizard mode.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.Wizard`.
- **Suggested snippet:** Use `GlobalFlag.Wizard` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Completions`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:218`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Defines the `--completions` global flag, which prints a shell completion script for the given shell.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.Completions`.
- **Suggested snippet:** Use `GlobalFlag.Completions` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.LogLevel`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:246`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Defines the global setting flag for command log level.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.LogLevel`.
- **Suggested snippet:** Use `GlobalFlag.LogLevel` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.BuiltIns`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:298`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Built-in global flags in default precedence order.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobalFlag } from "effect/unstable/cli"` and use `GlobalFlag.BuiltIns`.
- **Suggested snippet:** Use `GlobalFlag.BuiltIns` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.HandlerContext`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:36`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context passed to action handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.HandlerContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Action`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Action flag: side effect + exit (--help, --version, --completions).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.Action`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Setting (type) (type)`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:64`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Setting flag: configure command handler's environment (--log-level, --config).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.Setting (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Setting (type) (type)`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:75`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type helpers for global setting flags.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.Setting (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.Setting.Identifier`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:83`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level service identifier used by `Setting` global flags for the parsed value associated with a setting id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.Setting.Identifier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.GlobalFlag`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:92`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Global flag discriminated union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.GlobalFlag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/GlobalFlag.BuiltIn`

- **Source:** `packages/effect/src/unstable/cli/GlobalFlag.ts:312`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Global flag included in the default command-runner configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/GlobalFlag.BuiltIn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
