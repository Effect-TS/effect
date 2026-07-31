# Example Suggestions: `effect/unstable/reactivity/AtomHttpApi`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/reactivity/AtomHttpApi.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/reactivity/AtomHttpApi.Service`           |  169 | `root-declaration` | **recommended** |
| `effect/unstable/reactivity/AtomHttpApi.AtomHttpApiClient` |   43 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/reactivity/AtomHttpApi.Service`

- **Source:** `packages/effect/src/unstable/reactivity/AtomHttpApi.ts:169`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Context.Service` class for an HTTP API client backed by an atom runtime.
- **Signature hint:** `declare function Service<Self>(): <const Id extends string, ApiId extends string, Groups extends HttpApiGroup.Constraint>(id: Id, options: { readonly api: HttpApi.HttpApi<ApiId, Groups>; readonly httpClient: Layer.Layer<HttpApiGroup.ClientServices<Groups> | HttpClient.HttpClient> | ((get: Atom.AtomContext) => Layer.Layer<HttpApiGroup.ClientServices<Groups> | HttpClient.HttpClient>); readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined; readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown, unknown>) => Effect.Effect<unknown, unknown, unknown>) | undefined; readonly baseUrl?: URL | string | undefined; readonly runtime?: Atom.RuntimeFactory | undefined; }) => AtomHttpApiClient<Self, Id, Groups>`
- **Import guidance:** Start from `import { AtomHttpApi } from "effect/unstable/reactivity"` and use `AtomHttpApi.Service`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `Context.Service` class for an HTTP API client backed by an atom runtime. Call `AtomHttpApi.Service` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/reactivity/AtomHttpApi.AtomHttpApiClient`

- **Source:** `packages/effect/src/unstable/reactivity/AtomHttpApi.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `Context.Service` for an HTTP API client integrated with atom reactivity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/reactivity/AtomHttpApi.AtomHttpApiClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
