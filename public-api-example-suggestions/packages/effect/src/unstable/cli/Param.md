# Example Suggestions: `effect/unstable/cli/Param`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/Param.ts`
- **Uncovered API records:** 24
- **Priorities:** 0 required, 3 recommended, 20 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind                    | Priority        |
| ---------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cli/Param.makeSingle`               |  331 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Param.withFallbackConfig`       | 1372 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Param.withFallbackPrompt`       | 1431 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Param.VariadicParamOptions`     | 1458 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Param (type) (type)`      |   41 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.ParamKind`                |   54 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.argumentKind`             |   70 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.flagKind`                 |   85 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Any`                      |   93 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.AnyArgument`              |  101 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.AnyFlag`                  |  109 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Parse`                    |  123 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Param (type) (type)`      |  134 | `namespace`             | **optional**    |
| `effect/unstable/cli/Param.Flags`                    |  155 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.ParsedArgs`               |  165 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.FallbackPrompt`           |  177 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Single`                   |  192 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Map`                      |  210 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Transform`                |  225 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Optional`                 |  239 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.Variadic`                 |  253 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Param.VariadicParamOptions.min` | 1462 | `member`                | **optional**    |
| `effect/unstable/cli/Param.VariadicParamOptions.max` | 1466 | `member`                | **optional**    |
| `effect/unstable/cli/Param.Param.Variance`           |  141 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/unstable/cli/Param.makeSingle`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:331`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a leaf `Single` parameter from its kind, name, primitive parser, and optional help metadata.
- **Signature hint:** `declare function makeSingle<const Kind extends ParamKind, A>(params: { readonly kind: Kind; readonly name: string; readonly primitiveType: Primitive.Primitive<A>; readonly typeName?: string | undefined; readonly description?: Option.Option<string> | undefined; readonly aliases?: ReadonlyArray<string> | undefined; readonly hidden?: boolean | undefined; }): Single<Kind, A>`
- **Import guidance:** Start from `import { Param } from "effect/unstable/cli"` and use `Param.makeSingle`.
- **Suggested snippet:** Construct one representative value with `Param.makeSingle`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Param.withFallbackConfig`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:1372`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds a fallback config that is loaded when a required parameter is missing.
- **Signature hint:** `declare function withFallbackConfig<B>(config: Config.Config<B>): <Kind extends ParamKind, A>(self: Param<Kind, A>) => Param<Kind, A | B> declare function withFallbackConfig<Kind extends ParamKind, A, B>(self: Param<Kind, A>, config: Config.Config<B>): Param<Kind, A | B>`
- **Import guidance:** Start from `import { Param } from "effect/unstable/cli"` and use `Param.withFallbackConfig`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a fallback config that is loaded when a required parameter is missing. Call `Param.withFallbackConfig` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Param.withFallbackPrompt`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:1431`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Adds a fallback prompt that is shown when a required parameter is missing.
- **Signature hint:** `declare function withFallbackPrompt<B>(prompt: FallbackPrompt<B>): <Kind extends ParamKind, A>(self: Param<Kind, A>) => Param<Kind, A | B> declare function withFallbackPrompt<Kind extends ParamKind, A, B>(self: Param<Kind, A>, prompt: FallbackPrompt<B>): Param<Kind, A | B>`
- **Import guidance:** Start from `import { Param } from "effect/unstable/cli"` and use `Param.withFallbackPrompt`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a fallback prompt that is shown when a required parameter is missing. Call `Param.withFallbackPrompt` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cli/Param.VariadicParamOptions`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:1458`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Represent options which can be used to configure variadic parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.VariadicParamOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Param (type) (type)`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Polymorphic CLI parameter shared by `Argument` and `Flag`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Param (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.ParamKind`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Discriminator for whether a `Param` parses positional arguments or command-line flags.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.ParamKind`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.argumentKind`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:70`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the kind discriminator for positional argument parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Param } from "effect/unstable/cli"` and use `Param.argumentKind`.
- **Suggested snippet:** Use `Param.argumentKind` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.flagKind`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:85`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the kind discriminator for flag parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Param } from "effect/unstable/cli"` and use `Param.flagKind`.
- **Suggested snippet:** Use `Param.flagKind` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Any`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:93`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents any parameter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.AnyArgument`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:101`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents any positional argument parameter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.AnyArgument`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.AnyFlag`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:109`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents any flag parameter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.AnyFlag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Parse`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:123`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Function type used by parameters to parse currently available flags and positional arguments.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Parse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Param (type) (type)`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:134`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level utilities attached to the `Param` interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Param (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Flags`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:155`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Map of flag names to their provided string values. Multiple occurrences of a flag produce multiple values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Flags`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.ParsedArgs`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:165`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input context passed to `Param.parse` implementations. - `flags`: already-collected flag values by canonical flag name - `arguments`: remaining positional arguments to be consumed
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.ParsedArgs`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.FallbackPrompt`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:177`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a fallback prompt that can either be provided directly or computed effectfully when the parameter is missing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.FallbackPrompt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Single`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:192`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Leaf parameter that reads one named argument or flag with a primitive parser.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Single`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Map`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:210`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parameter node that maps the successfully parsed value of another parameter with a pure function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Map`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Transform`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:225`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parameter node that rewrites another parameter's parser, allowing effectful validation, fallback behavior, or error translation while preserving the same parameter kind.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Transform`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Optional`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:239`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parameter node that turns a missing argument or flag into `Option.none()` and a present parsed value into `Option.some(value)`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Optional`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.Variadic`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:253`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parameter node that parses another parameter zero or more times and returns all parsed values as an array, respecting optional minimum and maximum occurrence bounds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Param.Variadic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.VariadicParamOptions.min`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:1462`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The minimum number of times the parameter can be specified.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Param.VariadicParamOptions.min` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Param.VariadicParamOptions.max`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:1466`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The maximum number of times the parameter can be specified.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Param.VariadicParamOptions.max` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cli/Param.Param.Variance`

- **Source:** `packages/effect/src/unstable/cli/Param.ts:141`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Variance and pipeability marker carried by every `Param` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/Param.Param.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
