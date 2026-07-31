# Example Suggestions: `effect/unstable/http/HttpMethod`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 1 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind                    | Priority        |
| ---------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpMethod.hasBody`                  |   57 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMethod.HttpMethod (type) (type)` |   18 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpMethod.HttpMethod (type) (type)` |   33 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpMethod.HttpMethod.NoBody`        |   40 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpMethod.HttpMethod.WithBody`      |   48 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpMethod.all`                      |   71 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpMethod.allShort`                 |   94 | `root-declaration`      | **optional**    |

## Recommended

### `effect/unstable/http/HttpMethod.hasBody`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:57`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a method can carry a request body and narrows it to `HttpMethod.WithBody`.
- **Signature hint:** `declare function hasBody(method: HttpMethod): method is HttpMethod.WithBody`
- **Import guidance:** Start from `import { HttpMethod } from "effect/unstable/http"` and use `HttpMethod.hasBody`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpMethod.hasBody` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpMethod.HttpMethod (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:18`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of supported uppercase HTTP method literals.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMethod.HttpMethod (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMethod.HttpMethod (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:33`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing subtype helpers associated with `HttpMethod`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMethod.HttpMethod (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMethod.HttpMethod.NoBody`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:40`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP methods that this module treats as not carrying a request body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMethod.HttpMethod.NoBody`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMethod.HttpMethod.WithBody`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:48`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP methods that this module treats as capable of carrying a request body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMethod.HttpMethod.WithBody`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMethod.all`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:71`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Provides a readonly set containing every supported `HttpMethod` literal.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpMethod } from "effect/unstable/http"` and use `HttpMethod.all`.
- **Suggested snippet:** Use `HttpMethod.all` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMethod.allShort`

- **Source:** `packages/effect/src/unstable/http/HttpMethod.ts:94`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Provides tuples mapping each supported HTTP method to its short request-constructor name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpMethod } from "effect/unstable/http"` and use `HttpMethod.allShort`.
- **Suggested snippet:** Use `HttpMethod.allShort` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
