# Example Suggestions: `effect/unstable/ai/McpServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/McpServer.ts`
- **Uncovered API records:** 16
- **Priorities:** 0 required, 11 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/McpServer.layer`               |  869 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.layerHttp`           | 1048 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.toolkit`             | 1337 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.registerResource`    | 1401 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.resource`            | 1580 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.prompt`              | 1778 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.McpServer`           |  110 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.run`                 |  458 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.registerToolkit`     | 1249 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.registerPrompt`      | 1653 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.elicit`              | 1816 | `root-declaration` | **recommended** |
| `effect/unstable/ai/McpServer.clientCapabilities`  | 1853 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpServer.McpServer.make`      |  200 | `member`           | **optional**    |
| `effect/unstable/ai/McpServer.McpServer.layer`     |  385 | `member`           | **optional**    |
| `effect/unstable/ai/McpServer.ValidateCompletions` | 1355 | `root-declaration` | **optional**    |
| `effect/unstable/ai/McpServer.ResourceCompletions` | 1377 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/ai/McpServer.layer`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:869`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that starts an MCP server over an existing `RpcServer.Protocol` and provides the `McpServer` and `McpServerClient` services.
- **Signature hint:** `declare function layer(options: { readonly name: string; readonly version: string; readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>; readonly extensions?: Record<'${string}/${string}', unknown> | undefined; }): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, RpcServer.Protocol>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `McpServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.layerHttp`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1048`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Registers a Streamable HTTP MCP endpoint at `options.path`.
- **Signature hint:** `declare function layerHttp(options: { readonly name: string; readonly version: string; readonly path: HttpRouter.PathInput; readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>; readonly allowedOrigins?: ReadonlyArray<string> | undefined; readonly extensions?: Record<'${string}/${string}', unknown> | undefined; }): Layer.Layer<McpServer | McpServerClient, Cause.IllegalArgumentError, HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.layerHttp`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `McpServer.layerHttp`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.toolkit`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1337`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **recommended**
- **Current description:** Registers an `AiToolkit` with the `McpServer`.
- **Signature hint:** `declare function toolkit<Tools extends Record<string, Tool.Any>>(toolkit: Toolkit.Toolkit<Tools>): Layer.Layer<never, never, Tool.HandlersFor<Tools> | Exclude<Tool.HandlerServices<Tools>, McpServerClient>>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.toolkit`.
- **Suggested snippet:** Use the public setup or registry consumed by `McpServer.toolkit`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.registerResource`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1401`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Registers an MCP resource or resource template from an Effect program.
- **Signature hint:** `declare function registerResource<E, R>(options: { readonly uri: string; readonly name: string; readonly description?: string | undefined; readonly mimeType?: string | undefined; readonly audience?: ReadonlyArray<'user' | 'assistant'> | undefined; readonly priority?: number | undefined; readonly content: Effect.Effect<typeof ReadResourceResult.Type | string | Uint8Array, E, R>; readonly annotations?: Context.Context<never> | undefined; }): Effect.Effect<void, never, Exclude<R, McpServerClient> | McpServer> declare function registerResource<const Schemas extends ReadonlyArray<Schema.Constraint>>(segments: TemplateStringsArray, ...schemas: Schemas): <E, R, const Completions extends Partial<ResourceCompletions<Schemas>> = {}>(options: { readonly name: string; readonly description?: string | undefined; readonly mimeType?: string | undefined; readonly audience?: ReadonlyArray<'user' | 'assistant'> | undefined; readonly priority?: number | undefined; readonly completion?: ValidateCompletions<Completions, keyof ResourceCompletions<Schemas>> | undefined; readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]['Type']; }) => Effect.Effect<typeof ReadResourceResult.Type | string | Uint8Array, E, R>; readonly annotations?: Context.Context<never> | undefined; }) => Effect.Effect<void, never, Exclude<Schemas[number]['DecodingServices'] | Schemas[number]['EncodingServices'] | R | (Completions[keyof Completions] extends (input: string) => infer Ret ? Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never : never), McpServerClient> | McpServer>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.registerResource`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `McpServer.registerResource`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.resource`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1580`
- **Kind / category:** `root-declaration` / `resources`
- **Priority:** **recommended**
- **Current description:** Creates a layer that registers an MCP resource or resource template.
- **Signature hint:** `declare function resource<E, R>(options: { readonly uri: string; readonly name: string; readonly description?: string | undefined; readonly mimeType?: string | undefined; readonly audience?: ReadonlyArray<'user' | 'assistant'> | undefined; readonly priority?: number | undefined; readonly content: Effect.Effect<typeof ReadResourceResult.Type | string | Uint8Array, E, R>; }): Layer.Layer<never, never, Exclude<R, McpServerClient>> declare function resource<const Schemas extends ReadonlyArray<Schema.Constraint>>(segments: TemplateStringsArray, ...schemas: Schemas): <E, R, const Completions extends Partial<ResourceCompletions<Schemas>> = {}>(options: { readonly name: string; readonly description?: string | undefined; readonly mimeType?: string | undefined; readonly audience?: ReadonlyArray<'user' | 'assistant'> | undefined; readonly priority?: number | undefined; readonly completion?: ValidateCompletions<Completions, keyof ResourceCompletions<Schemas>> | undefined; readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]['Type']; }) => Effect.Effect<typeof ReadResourceResult.Type | string | Uint8Array, E, R>; }) => Layer.Layer<never, never, Exclude<R | (Completions[keyof Completions] extends (input: string) => infer Ret ? Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never : never), McpServerClient>>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.resource`.
- **Suggested snippet:** Use the public setup or registry consumed by `McpServer.resource`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.prompt`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1778`
- **Kind / category:** `root-declaration` / `prompts`
- **Priority:** **recommended**
- **Current description:** Creates a layer that registers an MCP prompt.
- **Signature hint:** `declare function prompt<E, R, Params extends Schema.Struct.Fields = {}, const Completions extends { readonly [K in keyof Params]?: (input: string, context: CompletionContext) => Effect.Effect<Array<Params[K]['Type']>, any, any>; } = {}>(options: { readonly name: string; readonly description?: string | undefined; readonly parameters?: Params | undefined; readonly completion?: ValidateCompletions<Completions, Extract<keyof Params, string>> | undefined; readonly content: (params: Schema.Struct.Type<Params>) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>; readonly annotations?: Context.Context<never> | undefined; }): Layer.Layer<never, never, Exclude<Schema.Struct.DecodingServices<Params> | R, McpServerClient>>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.prompt`.
- **Suggested snippet:** Use the public setup or registry consumed by `McpServer.prompt`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.McpServer`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:110`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **recommended**
- **Current description:** Service that stores and serves an MCP server's registered tools, resources, prompts, completions, and outgoing notifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.McpServer`.
- **Suggested snippet:** Consume `McpServer.McpServer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.run`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:458`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs an MCP server over the current `RpcServer.Protocol`.
- **Signature hint:** `declare function run(options: { readonly name: string; readonly version: string; readonly protocols: Arr.NonEmptyReadonlyArray<McpProtocol.ProtocolAdapter>; readonly extensions?: Record<'${string}/${string}', unknown> | undefined; }): Effect.Effect<never, Cause.IllegalArgumentError, McpServer | RpcServer.Protocol>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `McpServer.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.registerToolkit`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1249`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **recommended**
- **Current description:** Registers a `Toolkit` with the `McpServer`.
- **Signature hint:** `declare function registerToolkit<Tools extends Record<string, Tool.Any>>(toolkit: Toolkit.Toolkit<Tools>): Effect.Effect<void, never, McpServer | Tool.HandlersFor<Tools> | Exclude<Tool.HandlerServices<Tools>, McpServerClient>>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.registerToolkit`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `McpServer.registerToolkit`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.registerPrompt`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1653`
- **Kind / category:** `root-declaration` / `prompts`
- **Priority:** **recommended**
- **Current description:** Registers an MCP prompt from an Effect program.
- **Signature hint:** `declare function registerPrompt<E, R, Params extends Schema.Struct.Fields = {}, const Completions extends { readonly [K in keyof Params]?: (input: string, context: CompletionContext) => Effect.Effect<Array<Params[K]>, any, any>; } = {}>(options: { readonly name: string; readonly description?: string | undefined; readonly parameters?: Params | undefined; readonly completion?: ValidateCompletions<Completions, Extract<keyof Params, string>> | undefined; readonly content: (params: Params) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>; readonly annotations?: Context.Context<never> | undefined; }): Effect.Effect<void, never, Exclude<Schema.Struct.DecodingServices<Params> | R, McpServerClient> | McpServer>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.registerPrompt`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `McpServer.registerPrompt`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/McpServer.elicit`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1816`
- **Kind / category:** `root-declaration` / `elicitation`
- **Priority:** **recommended**
- **Current description:** Collects structured input from the current MCP client and decodes the accepted response with `schema`.
- **Signature hint:** `declare function elicit<S extends Schema.ConstraintEncoder<Record<string, unknown>, unknown>>(options: { readonly message: string; readonly schema: S; }): Effect.Effect<S['Type'], ElicitationDeclined, McpServerClient | S['DecodingServices']>`
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.elicit`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `McpServer.elicit`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/McpServer.clientCapabilities`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1853`
- **Kind / category:** `root-declaration` / `capabilities`
- **Priority:** **optional**
- **Current description:** Accesses the current client's capabilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { McpServer } from "effect/unstable/ai"` and use `McpServer.clientCapabilities`.
- **Suggested snippet:** Use `McpServer.clientCapabilities` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpServer.McpServer.make`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:200`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds an MCP server service from registered tools, prompts, resources, and completions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/McpServer.McpServer.make` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpServer.McpServer.layer`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:385`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Layer that provides the MCP server and client services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/McpServer.McpServer.layer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpServer.ValidateCompletions`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1355`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Utility type that validates a completion-handler record against the allowed parameter keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpServer.ValidateCompletions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/McpServer.ResourceCompletions`

- **Source:** `packages/effect/src/unstable/ai/McpServer.ts:1377`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Completion-handler map for a resource URI template.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/McpServer.ResourceCompletions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
