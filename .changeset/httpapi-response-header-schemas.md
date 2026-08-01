---
"effect": minor
---

Add `HttpApiSchema.WithHeaders` for typed HTTP response headers.

Response schemas can now declare headers alongside a body:

```ts
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiSchema } from "effect/unstable/httpapi"

const create = HttpApiEndpoint.post("create", "/things", {
  success: HttpApiSchema.WithHeaders({
    headers: { location: Schema.String },
    body: HttpApiSchema.Created
  })
})
```

Handlers return `{ headers, body }` and generated clients decode the declared
headers into the same shape. Header strictness follows the schema: a required
header that is missing from a response is a decode failure, while
`Schema.optional` yields `undefined`. `WithHeaders` works for successes, errors,
and streaming responses, and the declared headers are emitted in the generated
OpenAPI document as `responses[status].headers`.

A `WithHeaders` response may not share a status and content-type with any other
response of the same endpoint, since the client discriminates response
alternatives on exactly those two signals.
