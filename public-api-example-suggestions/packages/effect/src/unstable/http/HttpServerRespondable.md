# Example Suggestions: `effect/unstable/http/HttpServerRespondable`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 4 recommended, 1 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpServerRespondable.isRespondable`          |   48 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRespondable.toResponse`             |   64 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRespondable.toResponseOrElse`       |   83 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRespondable.toResponseOrElseDefect` |  108 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRespondable.Respondable`            |   38 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRespondable.symbol`                 |   25 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/http/HttpServerRespondable.isRespondable`

- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts:48`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the supplied value implements the `Respondable` protocol.
- **Signature hint:** `declare function isRespondable(u: unknown): u is Respondable`
- **Import guidance:** Start from `import { HttpServerRespondable } from "effect/unstable/http"` and use `HttpServerRespondable.isRespondable`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpServerRespondable.isRespondable` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRespondable.toResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts:64`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Converts a `Respondable` value into an `HttpServerResponse`.
- **Signature hint:** `declare function toResponse(self: Respondable): Effect.Effect<HttpServerResponse>`
- **Import guidance:** Start from `import { HttpServerRespondable } from "effect/unstable/http"` and use `HttpServerRespondable.toResponse`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRespondable.toResponse`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRespondable.toResponseOrElse`

- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts:83`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Attempts to convert an unknown value into an `HttpServerResponse`, falling back to the supplied response when no conversion is available.
- **Signature hint:** `declare function toResponseOrElse(u: unknown, orElse: HttpServerResponse): Effect.Effect<HttpServerResponse>`
- **Import guidance:** Start from `import { HttpServerRespondable } from "effect/unstable/http"` and use `HttpServerRespondable.toResponseOrElse`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRespondable.toResponseOrElse`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRespondable.toResponseOrElseDefect`

- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts:108`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Attempts to convert an unknown defect into an `HttpServerResponse`, falling back to the supplied response when no conversion is available.
- **Signature hint:** `declare function toResponseOrElseDefect(u: unknown, orElse: HttpServerResponse): Effect.Effect<HttpServerResponse>`
- **Import guidance:** Start from `import { HttpServerRespondable } from "effect/unstable/http"` and use `HttpServerRespondable.toResponseOrElseDefect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRespondable.toResponseOrElseDefect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpServerRespondable.Respondable`

- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts:38`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Protocol for values that can be converted into an `HttpServerResponse`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerRespondable.Respondable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpServerRespondable.symbol`

- **Source:** `packages/effect/src/unstable/http/HttpServerRespondable.ts:25`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Protocol key used by values that can render themselves as `HttpServerResponse` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerRespondable } from "effect/unstable/http"` and use `HttpServerRespondable.symbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpServerRespondable.symbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
