# Example Suggestions: `effect/unstable/httpapi/HttpApiError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts`
- **Uncovered API records:** 29
- **Priorities:** 0 required, 27 recommended, 0 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind               | Priority        |
| ----------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiError.BadRequest`                       |   42 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.BadRequestNoContent`              |   62 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.Unauthorized`                     |   73 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.UnauthorizedNoContent`            |   92 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.Forbidden`                        |  103 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.ForbiddenNoContent`               |  122 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.NotFound`                         |  133 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.NotFoundNoContent`                |  152 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.MethodNotAllowed`                 |  163 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.MethodNotAllowedNoContent`        |  182 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.NotAcceptable`                    |  193 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.NotAcceptableNoContent`           |  212 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.RequestTimeout`                   |  223 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.RequestTimeoutNoContent`          |  242 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.Conflict`                         |  253 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.ConflictNoContent`                |  272 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.Gone`                             |  283 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.GoneNoContent`                    |  302 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.UnprocessableEntity`              |  313 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.UnprocessableEntityNoContent`     |  334 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.InternalServerError`              |  345 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.InternalServerErrorNoContent`     |  365 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.NotImplemented`                   |  376 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.NotImplementedNoContent`          |  394 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.ServiceUnavailable`               |  405 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.ServiceUnavailableNoContent`      |  425 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.HttpApiSchemaError`               |  453 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiError.HttpApiSchemaErrorTypeId (type)`  |  435 | `root-declaration` | **discouraged** |
| `effect/unstable/httpapi/HttpApiError.HttpApiSchemaErrorTypeId (value)` |  443 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/httpapi/HttpApiError.BadRequest`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:42`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `400 Bad Request` response. When used directly as a server response, it renders as an empty response with status 400.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.BadRequest`.
- **Suggested snippet:** Create or capture `HttpApiError.BadRequest` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.BadRequestNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:62`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `BadRequest`, decoding an empty 400 response into a `BadRequest` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.BadRequestNoContent`.
- **Suggested snippet:** Use `HttpApiError.BadRequestNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.Unauthorized`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:73`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `401 Unauthorized` response. When used directly as a server response, it renders as an empty response with status 401.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.Unauthorized`.
- **Suggested snippet:** Create or capture `HttpApiError.Unauthorized` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.UnauthorizedNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:92`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `Unauthorized`, decoding an empty 401 response into an `Unauthorized` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.UnauthorizedNoContent`.
- **Suggested snippet:** Use `HttpApiError.UnauthorizedNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.Forbidden`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:103`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `403 Forbidden` response. When used directly as a server response, it renders as an empty response with status 403.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.Forbidden`.
- **Suggested snippet:** Create or capture `HttpApiError.Forbidden` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.ForbiddenNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:122`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `Forbidden`, decoding an empty 403 response into a `Forbidden` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.ForbiddenNoContent`.
- **Suggested snippet:** Use `HttpApiError.ForbiddenNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.NotFound`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:133`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `404 Not Found` response. When used directly as a server response, it renders as an empty response with status 404.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.NotFound`.
- **Suggested snippet:** Create or capture `HttpApiError.NotFound` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.NotFoundNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:152`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `NotFound`, decoding an empty 404 response into a `NotFound` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.NotFoundNoContent`.
- **Suggested snippet:** Use `HttpApiError.NotFoundNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.MethodNotAllowed`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:163`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `405 Method Not Allowed` response. When used directly as a server response, it renders as an empty response with status 405.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.MethodNotAllowed`.
- **Suggested snippet:** Create or capture `HttpApiError.MethodNotAllowed` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.MethodNotAllowedNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:182`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `MethodNotAllowed`, decoding an empty 405 response into a `MethodNotAllowed` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.MethodNotAllowedNoContent`.
- **Suggested snippet:** Use `HttpApiError.MethodNotAllowedNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.NotAcceptable`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:193`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `406 Not Acceptable` response. When used directly as a server response, it renders as an empty response with status 406.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.NotAcceptable`.
- **Suggested snippet:** Create or capture `HttpApiError.NotAcceptable` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.NotAcceptableNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:212`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `NotAcceptable`, decoding an empty 406 response into a `NotAcceptable` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.NotAcceptableNoContent`.
- **Suggested snippet:** Use `HttpApiError.NotAcceptableNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.RequestTimeout`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:223`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `408 Request Timeout` response. When used directly as a server response, it renders as an empty response with status 408.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.RequestTimeout`.
- **Suggested snippet:** Create or capture `HttpApiError.RequestTimeout` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.RequestTimeoutNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:242`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `RequestTimeout`, decoding an empty 408 response into a `RequestTimeout` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.RequestTimeoutNoContent`.
- **Suggested snippet:** Use `HttpApiError.RequestTimeoutNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.Conflict`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:253`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `409 Conflict` response. When used directly as a server response, it renders as an empty response with status 409.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.Conflict`.
- **Suggested snippet:** Create or capture `HttpApiError.Conflict` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.ConflictNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:272`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `Conflict`, decoding an empty 409 response into a `Conflict` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.ConflictNoContent`.
- **Suggested snippet:** Use `HttpApiError.ConflictNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.Gone`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:283`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `410 Gone` response. When used directly as a server response, it renders as an empty response with status 410.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.Gone`.
- **Suggested snippet:** Create or capture `HttpApiError.Gone` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.GoneNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:302`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `Gone`, decoding an empty 410 response into a `Gone` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.GoneNoContent`.
- **Suggested snippet:** Use `HttpApiError.GoneNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.UnprocessableEntity`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:313`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `422 Unprocessable Entity` response. When used directly as a server response, it renders as an empty response with status 422.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.UnprocessableEntity`.
- **Suggested snippet:** Create or capture `HttpApiError.UnprocessableEntity` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.UnprocessableEntityNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:334`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `UnprocessableEntity`, decoding an empty 422 response into an `UnprocessableEntity` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.UnprocessableEntityNoContent`.
- **Suggested snippet:** Use `HttpApiError.UnprocessableEntityNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.InternalServerError`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:345`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `500 Internal Server Error` response. When used directly as a server response, it renders as an empty response with status 500.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.InternalServerError`.
- **Suggested snippet:** Create or capture `HttpApiError.InternalServerError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.InternalServerErrorNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:365`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `InternalServerError`, decoding an empty 500 response into an `InternalServerError` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.InternalServerErrorNoContent`.
- **Suggested snippet:** Use `HttpApiError.InternalServerErrorNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.NotImplemented`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:376`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `501 Not Implemented` response. When used directly as a server response, it renders as an empty response with status 501.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.NotImplemented`.
- **Suggested snippet:** Create or capture `HttpApiError.NotImplemented` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.NotImplementedNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:394`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `NotImplemented`, decoding an empty 501 response into a `NotImplemented` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.NotImplementedNoContent`.
- **Suggested snippet:** Use `HttpApiError.NotImplementedNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.ServiceUnavailable`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:405`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Built-in HTTP API error for a `503 Service Unavailable` response. When used directly as a server response, it renders as an empty response with status 503.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.ServiceUnavailable`.
- **Suggested snippet:** Create or capture `HttpApiError.ServiceUnavailable` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.ServiceUnavailableNoContent`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:425`
- **Kind / category:** `root-declaration` / `NoContent errors`
- **Priority:** **recommended**
- **Current description:** No-content schema variant for `ServiceUnavailable`, decoding an empty 503 response into a `ServiceUnavailable` error value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.ServiceUnavailableNoContent`.
- **Suggested snippet:** Use `HttpApiError.ServiceUnavailableNoContent` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiError.HttpApiSchemaError`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:453`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when an HTTP API request component fails schema decoding. It records which component failed and responds as an empty `400 Bad Request` when rendered as a server response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.HttpApiSchemaError`.
- **Suggested snippet:** Create or capture `HttpApiError.HttpApiSchemaError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/unstable/httpapi/HttpApiError.HttpApiSchemaErrorTypeId (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:435`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `HttpApiSchemaError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/httpapi/HttpApiError.HttpApiSchemaErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/httpapi/HttpApiError.HttpApiSchemaErrorTypeId (value)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiError.ts:443`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier used to mark and detect `HttpApiSchemaError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiError } from "effect/unstable/httpapi"` and use `HttpApiError.HttpApiSchemaErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpApiError.HttpApiSchemaErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
