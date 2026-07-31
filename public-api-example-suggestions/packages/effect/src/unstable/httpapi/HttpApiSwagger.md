# Example Suggestions: `effect/unstable/httpapi/HttpApiSwagger`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSwagger.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiSwagger.layer` |   59 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/httpapi/HttpApiSwagger.layer`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSwagger.ts:59`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Mounts Swagger UI for an `HttpApi` at the configured path, defaulting to `/docs`, using the OpenAPI specification generated from the API.
- **Signature hint:** `declare function layer<Id extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<Id, Groups>, options?: { readonly path?: '/${string}' | undefined; }): Layer.Layer<never, never, HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { HttpApiSwagger } from "effect/unstable/httpapi"` and use `HttpApiSwagger.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpApiSwagger.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
