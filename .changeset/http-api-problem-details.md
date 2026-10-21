---
"effect": minor
---

Add opt-in RFC 9457 Problem Details support to `HttpApi`.

- `ProblemDetails` in `effect/http` provides the `application/problem+json` media type, a lenient codec for problem details objects, and a response constructor.
- `HttpApiError.Problem` declares a typed problem as a yieldable error class that endpoints render, document and decode as `application/problem+json`.
- `HttpApiSchema.asProblem` renders a built-in error such as `HttpApiError.NotFound` as a problem.
- `HttpApiMiddleware.ProblemDetails` with `HttpApiMiddleware.layerProblemDetails` renders request decoding failures as a generic `400` problem (with per-field `errors` when `includeDetails` is enabled) and response encoding failures as a `500` problem.

The default behaviour is unchanged: without the opt-in, built-in errors and decoding failures still produce the same responses as before.
