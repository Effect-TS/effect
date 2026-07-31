# Example Suggestions: `effect/unstable/cli/Command`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/Command.ts`
- **Uncovered API records:** 31
- **Priorities:** 0 required, 10 recommended, 20 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind                    | Priority        |
| ------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cli/Command.withGlobalFlags`           | 1049 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.isCommand`                 |  525 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.withSharedFlags`           |  951 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.withShortDescription`      | 1173 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.withAlias`                 | 1197 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.annotate`                  | 1267 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.annotateMerge`             | 1311 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.provideSync`               | 1480 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.provideEffect`             | 1520 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.provideEffectDiscard`      | 1550 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Command.Command.name`              |  132 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.description`       |  137 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.shortDescription`  |  142 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.alias`             |  147 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.examples`          |  152 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.subcommands`       |  157 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.annotations`       |  165 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command.hidden`            |  172 | `member`                | **optional**    |
| `effect/unstable/cli/Command.Command`                   |  181 | `namespace`             | **optional**    |
| `effect/unstable/cli/Command.Command.Example`           |  205 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Command.Command.FlagConfig`        |  267 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Command.Command.Config`            |  279 | `namespace`             | **optional**    |
| `effect/unstable/cli/Command.Command.Config.InferValue` |  331 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Command.Command.Any`               |  343 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Command.Command.SubcommandGroup`   |  364 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Command.Command.SubcommandEntry`   |  375 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Command.Environment`               |  390 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Command.Error`                     |  398 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Command.Services`                  |  413 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Command.ParsedTokens`              |  504 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Command.Command.Variance`          |  193 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/unstable/cli/Command.withGlobalFlags`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1049`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds global flags to a command scope.
- **Signature hint:** `declare function withGlobalFlags<const GlobalFlags extends ReadonlyArray<GlobalFlag.GlobalFlag<any>>>(globalFlags: GlobalFlags): <Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E, Exclude<R, ExtractGlobalFlagContext<GlobalFlags>>> declare function withGlobalFlags<Name extends string, Input, E, R, ContextInput, const GlobalFlags extends ReadonlyArray<GlobalFlag.GlobalFlag<any>>>(self: Command<Name, Input, ContextInput, E, R>, globalFlags: GlobalFlags): Command<Name, Input, ContextInput, E, Exclude<R, ExtractGlobalFlagContext<GlobalFlags>>>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.withGlobalFlags`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds global flags to a command scope. Call `Command.withGlobalFlags` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.isCommand`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:525`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the provided value is a `Command`.
- **Signature hint:** `declare function isCommand(u: unknown): u is Command.Any`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.isCommand`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Command.isCommand` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.withSharedFlags`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:951`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds flags that are inherited by subcommands.
- **Signature hint:** `declare function withSharedFlags<const SharedFlags extends Command.FlagConfig>(sharedFlags: SharedFlags): <Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Simplify<Input & Command.Config.Infer<SharedFlags>>, Simplify<ContextInput & Command.Config.Infer<SharedFlags>>, E, R> declare function withSharedFlags<Name extends string, Input, E, R, ContextInput, const SharedFlags extends Command.FlagConfig>(self: Command<Name, Input, ContextInput, E, R>, sharedFlags: SharedFlags): Command<Name, Simplify<Input & Command.Config.Infer<SharedFlags>>, Simplify<ContextInput & Command.Config.Infer<SharedFlags>>, E, R>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.withSharedFlags`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds flags that are inherited by subcommands. Call `Command.withSharedFlags` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.withShortDescription`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1173`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a short description for a command.
- **Signature hint:** `declare function withShortDescription(shortDescription: string): <const Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E, R> declare function withShortDescription<const Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>, shortDescription: string): Command<Name, Input, ContextInput, E, R>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.withShortDescription`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a short description for a command. Call `Command.withShortDescription` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.withAlias`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1197`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets an alias for a command.
- **Signature hint:** `declare function withAlias(alias: string): <const Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E, R> declare function withAlias<const Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>, alias: string): Command<Name, Input, ContextInput, E, R>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.withAlias`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets an alias for a command. Call `Command.withAlias` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.annotate`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1267`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds a custom annotation to a command.
- **Signature hint:** `declare function annotate<I, S>(service: Context.Key<I, S>, value: NoInfer<S>): <Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E, R> declare function annotate<Name extends string, Input, E, R, ContextInput, I, S>(self: Command<Name, Input, ContextInput, E, R>, service: Context.Key<I, S>, value: NoInfer<S>): Command<Name, Input, ContextInput, E, R>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.annotate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a custom annotation to a command. Call `Command.annotate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.annotateMerge`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1311`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Merges a Context of annotations into a command.
- **Signature hint:** `declare function annotateMerge<I>(annotations: Context.Context<I>): <Name extends string, Input, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E, R> declare function annotateMerge<Name extends string, Input, E, R, ContextInput, I>(self: Command<Name, Input, ContextInput, E, R>, annotations: Context.Context<I>): Command<Name, Input, ContextInput, E, R>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.annotateMerge`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Merges a Context of annotations into a command. Call `Command.annotateMerge` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.provideSync`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1480`
- **Kind / category:** `root-declaration` / `providing services`
- **Priority:** **recommended**
- **Current description:** Provides the handler of a command with the implementation of a service that optionally depends on the command-line input to be constructed.
- **Signature hint:** `declare function provideSync<I, S, Input>(service: Context.Key<I, S>, implementation: S | ((input: Input) => S)): <const Name extends string, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E, Exclude<R, I>> declare function provideSync<const Name extends string, Input, E, R, ContextInput, I, S>(self: Command<Name, Input, ContextInput, E, R>, service: Context.Key<I, S>, implementation: S | ((input: Input) => S)): Command<Name, Input, ContextInput, E, Exclude<R, I>>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.provideSync`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides the handler of a command with the implementation of a service that optionally depends on the command-line input to be constructed. Call `Command.provideSync` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.provideEffect`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1520`
- **Kind / category:** `root-declaration` / `providing services`
- **Priority:** **recommended**
- **Current description:** Provides the handler of a command with the service produced by an effect that optionally depends on the command-line input to be created.
- **Signature hint:** `declare function provideEffect<I, S, Input, R2, E2>(service: Context.Key<I, S>, effect: Effect.Effect<S, E2, R2> | ((input: Input) => Effect.Effect<S, E2, R2>)): <const Name extends string, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E | E2, Exclude<R, I> | R2> declare function provideEffect<const Name extends string, Input, E, R, ContextInput, I, S, R2, E2>(self: Command<Name, Input, ContextInput, E, R>, service: Context.Key<I, S>, effect: Effect.Effect<S, E2, R2> | ((input: Input) => Effect.Effect<S, E2, R2>)): Command<Name, Input, ContextInput, E | E2, Exclude<R, I> | R2>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.provideEffect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides the handler of a command with the service produced by an effect that optionally depends on the command-line input to be created. Call `Command.provideEffect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Command.provideEffectDiscard`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:1550`
- **Kind / category:** `root-declaration` / `providing services`
- **Priority:** **recommended**
- **Current description:** Allows for execution of an effect, which optionally depends on command-line input to be created, prior to executing the handler of a command.
- **Signature hint:** `declare function provideEffectDiscard<_, Input, E2, R2>(effect: Effect.Effect<_, E2, R2> | ((input: Input) => Effect.Effect<_, E2, R2>)): <const Name extends string, E, R, ContextInput>(self: Command<Name, Input, ContextInput, E, R>) => Command<Name, Input, ContextInput, E | E2, R | R2> declare function provideEffectDiscard<const Name extends string, Input, E, R, ContextInput, _, E2, R2>(self: Command<Name, Input, ContextInput, E, R>, effect: Effect.Effect<_, E2, R2> | ((input: Input) => Effect.Effect<_, E2, R2>)): Command<Name, Input, ContextInput, E | E2, R | R2>`
- **Import guidance:** Start from `import { Command } from "effect/unstable/cli"` and use `Command.provideEffectDiscard`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Allows for execution of an effect, which optionally depends on command-line input to be created, prior to executing the handler of a command. Call `Command.provideEffectDiscard` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cli/Command.Command.name`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.description`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:137`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An optional description of the command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.shortDescription`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:142`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An optional short description used when listing subcommands.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.shortDescription` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.alias`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:147`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An optional alias that can be used as a shorter command name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.alias` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.examples`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:152`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional usage examples for the command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.examples` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.subcommands`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:157`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The subcommands available under this command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.subcommands` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.annotations`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:165`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Custom annotations associated with this command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.annotations` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.hidden`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:172`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this command is hidden from parent help output, shell completions, and unknown-subcommand suggestions. Hidden commands still parse and execute normally when invoked by exact name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Command.Command.hidden` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:181`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level helpers and configuration shapes used by `Command`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.Example`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:205`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a concrete usage example for a command.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.Example`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.FlagConfig`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:267`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration shape accepted by `Command.withSharedFlags`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.FlagConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.Config`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:279`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Utilities for working with command configurations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.Config`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.Config.InferValue`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:331`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Helper type utility for recursively inferring types from Config values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.Config.InferValue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.Any`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:343`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents any Command regardless of its type parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.SubcommandGroup`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:364`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A grouped set of subcommands used by `Command.withSubcommands`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.SubcommandGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Command.SubcommandEntry`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:375`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Entry type accepted by `Command.withSubcommands`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Command.SubcommandEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Environment`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:390`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Services required by CLI parsing and execution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Environment`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Error`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:398`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the error type from a `Command`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.Services`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:413`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A utility type to extract the required services type from a `Command`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Command.ParsedTokens`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:504`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the parsed tokens from command-line input before validation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Command.ParsedTokens`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cli/Command.Command.Variance`

- **Source:** `packages/effect/src/unstable/cli/Command.ts:193`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Command`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/Command.Command.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
