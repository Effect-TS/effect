# Example Suggestions: `effect/unstable/http/HttpIncomingMessage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 4 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                              | Line | Kind               | Priority        |
| ---------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpIncomingMessage.isHttpIncomingMessage` |   39 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpIncomingMessage.schemaBodyJson`        |   64 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpIncomingMessage.schemaBodyUrlParams`   |   78 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpIncomingMessage.schemaHeaders`         |  100 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpIncomingMessage.MaxBodySize`           |  114 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpIncomingMessage.inspect`               |  125 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpIncomingMessage.HttpIncomingMessage`   |   47 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpIncomingMessage.TypeId`                |   31 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/http/HttpIncomingMessage.isHttpIncomingMessage`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:39`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `HttpIncomingMessage`.
- **Signature hint:** `declare function isHttpIncomingMessage(u: unknown): u is HttpIncomingMessage`
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.isHttpIncomingMessage`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpIncomingMessage.isHttpIncomingMessage` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpIncomingMessage.schemaBodyJson`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:64`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder that reads an incoming message's JSON body and decodes it with the supplied schema.
- **Signature hint:** `declare function schemaBodyJson<S extends Schema.Constraint>(schema: S, options?: ParseOptions | undefined): <E>(self: HttpIncomingMessage<E>) => Effect.Effect<S['Type'], E | Schema.SchemaError, S['DecodingServices']>`
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.schemaBodyJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpIncomingMessage.schemaBodyJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpIncomingMessage.schemaBodyUrlParams`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:78`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder that reads an incoming message's URL-encoded body parameters and decodes them with the supplied schema.
- **Signature hint:** `declare function schemaBodyUrlParams<A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): <E>(self: HttpIncomingMessage<E>) => Effect.Effect<A, E | Schema.SchemaError, RD>`
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.schemaBodyUrlParams`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpIncomingMessage.schemaBodyUrlParams`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpIncomingMessage.schemaHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:100`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder that validates and decodes an incoming message's headers with the supplied schema.
- **Signature hint:** `declare function schemaHeaders<A, I extends Readonly<Record<string, string | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): <E>(self: HttpIncomingMessage<E>) => Effect.Effect<A, Schema.SchemaError, RD>`
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.schemaHeaders`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpIncomingMessage.schemaHeaders`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpIncomingMessage.MaxBodySize`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:114`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the optional maximum size allowed when reading an incoming message body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.MaxBodySize`.
- **Suggested snippet:** Consume `HttpIncomingMessage.MaxBodySize` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpIncomingMessage.inspect`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:125`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Builds an inspectable object for an incoming message, redacting headers and including a synchronously readable JSON or text body when available.
- **Signature hint:** `declare function inspect<E>(self: HttpIncomingMessage<E>, that: object): object`
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.inspect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds an inspectable object for an incoming message, redacting headers and including a synchronously readable JSON or text body when available. Call `HttpIncomingMessage.inspect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpIncomingMessage.HttpIncomingMessage`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:47`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Common model for incoming HTTP messages, with headers, remote address, and effectful body accessors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpIncomingMessage.HttpIncomingMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpIncomingMessage.TypeId`

- **Source:** `packages/effect/src/unstable/http/HttpIncomingMessage.ts:31`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type identifier for `HttpIncomingMessage` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpIncomingMessage } from "effect/unstable/http"` and use `HttpIncomingMessage.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpIncomingMessage.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
