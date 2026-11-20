---
"@effect/openapi-generator": patch
---

A response with no body can still have a description in the API documentation. For example, an OpenAPI file can describe a `404` as "Order not found". The generator used to copy the status code into the `HttpApi` and drop that text.

```ts
// Before
HttpApiSchema.Empty(404)

// After
HttpApiSchema.Empty(404).annotate({ description: "Order not found" })
```

Exporting the generated `HttpApi` back to OpenAPI now produces the original "Order not found" description.

### A shared `404` with its own description

In this OpenAPI 3.1 example, `$ref` points to a shared response whose description is "Resource not found". The line below it gives this particular `404` a more specific description.

```yaml
responses:
  "404":
    $ref: "#/components/responses/NotFound"
    description: Order not found
```

The generator writes `HttpApiSchema.Empty(404).annotate({ description: "Order not found" })`. If you omit the `description` line, it uses "Resource not found" from the shared response.

### An explicit `500` and a fallback

```yaml
responses:
  "200":
    description: OK
  "500":
    description: Server error
  default:
    description: Other errors
```

For this input, the generated endpoint has one error response, `HttpApiSchema.Empty(500).annotate({ description: "Server error" })`. The generator skips `default` and emits a warning because it would assign "Other errors" to the same status. If you remove the explicit `500` from this example, the generator uses `default` to produce a `500` described as "Other errors".
