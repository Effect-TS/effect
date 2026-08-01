import { assert, describe, it } from "@effect/vitest"
import { type Context, Schema } from "effect"
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
  OpenApi
} from "effect/unstable/httpapi"

class HeaderAuthA extends HttpApiMiddleware.Service<HeaderAuthA>()("HeaderAuthA", {
  security: {
    auth: HttpApiSecurity.apiKey({ key: "x-api-key" })
  }
}) {}

class HeaderAuthB extends HttpApiMiddleware.Service<HeaderAuthB>()("HeaderAuthB", {
  security: {
    auth: HttpApiSecurity.apiKey({ key: "x-api-key" })
  }
}) {}

class HeaderAuthUpper extends HttpApiMiddleware.Service<HeaderAuthUpper>()("HeaderAuthUpper", {
  security: {
    auth: HttpApiSecurity.apiKey({ key: "X-API-Key" })
  }
}) {}

class QueryAuth extends HttpApiMiddleware.Service<QueryAuth>()("QueryAuth", {
  security: {
    auth: HttpApiSecurity.apiKey({ key: "api_key", in: "query" })
  }
}) {}

class TokenAuthUpper extends HttpApiMiddleware.Service<TokenAuthUpper>()("TokenAuthUpper", {
  security: {
    auth: HttpApiSecurity.http({ scheme: "Token" })
  }
}) {}

class TokenAuthLower extends HttpApiMiddleware.Service<TokenAuthLower>()("TokenAuthLower", {
  security: {
    auth: HttpApiSecurity.http({ scheme: "token" })
  }
}) {}

class ProtoHeaderAuth extends HttpApiMiddleware.Service<ProtoHeaderAuth>()("ProtoHeaderAuth", {
  security: {
    ["__proto__"]: HttpApiSecurity.apiKey({ key: "x-api-key" })
  }
}) {}

class ProtoQueryAuth extends HttpApiMiddleware.Service<ProtoQueryAuth>()("ProtoQueryAuth", {
  security: {
    ["__proto__"]: HttpApiSecurity.apiKey({ key: "api_key", in: "query" })
  }
}) {}

const makeSecurityApi = (
  first: Context.Key<any, any>,
  second: Context.Key<any, any>
) =>
  HttpApi.make("Api").add(
    HttpApiGroup.make("test").add(
      HttpApiEndpoint.get("first", "/first").middleware(first),
      HttpApiEndpoint.get("second", "/second").middleware(second)
    )
  )

describe("OpenApi", () => {
  it("preserves every declared payload content type for normalized equivalents", () => {
    const profileA = "Application/Vnd.Effect+JSON; Profile=A"
    const profileB = "application/vnd.effect+json; profile=b"
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.post("create", "/create", {
          payload: [
            Schema.Struct({ a: Schema.String }).pipe(HttpApiSchema.asJson({ contentType: profileA })),
            Schema.Struct({ b: Schema.String }).pipe(HttpApiSchema.asJson({ contentType: profileB }))
          ]
        })
      )
    )

    const spec = OpenApi.fromApi(Api)
    const content = spec.paths["/create"]?.post?.requestBody?.content

    assert.isDefined(content)
    assert.property(content, profileA)
    assert.property(content, profileB)
    assert.deepStrictEqual(content[profileA]?.schema, {
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
      additionalProperties: false
    })
    assert.deepStrictEqual(content[profileB]?.schema, {
      type: "object",
      properties: { b: { type: "string" } },
      required: ["b"],
      additionalProperties: false
    })
  })

  it("emits buffered and stream successes with the same status", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("chat", "/chat", {
          success: [
            Schema.Struct({ message: Schema.String }),
            HttpApiSchema.StreamSse({
              events: Schema.Struct({ event: Schema.String, data: Schema.String }),
              error: Schema.Struct({ reason: Schema.String })
            })
          ]
        })
      )
    )

    const spec = OpenApi.fromApi(Api)
    const content = spec.paths["/chat"]?.get?.responses[200]?.content

    assert.isNotNull(content)
    assert.property(content, "application/json")
    assert.property(content, "text/event-stream")
    const streamExtension = content?.["text/event-stream"]?.["x-effect-stream"]
    assert.isNotNull(streamExtension)
    if (streamExtension?.encoding !== "sse") {
      throw new Error("Expected SSE stream extension")
    }
    assert.strictEqual(
      streamExtension.failureEvent,
      "effect/httpapi/stream/failure"
    )
    assert.property(streamExtension, "causeSchema")
    assert.property(streamExtension, "errorSchema")
  })

  it("rejects duplicate method and path pairs", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("first", "/shared"),
        HttpApiEndpoint.get("second", "/shared")
      )
    )

    assert.throws(() => OpenApi.fromApi(Api), /Duplicate OpenAPI operation for GET \/shared/)
  })

  it("rejects equivalent templated method and path pairs", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("first", "/users/:id"),
        HttpApiEndpoint.get("second", "/users/:userId")
      )
    )

    assert.throws(() => OpenApi.fromApi(Api), /Duplicate OpenAPI operation for GET \/users\/\{userId\}/)
  })

  it("rejects duplicate operation identifiers", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("first", "/first").annotate(OpenApi.Identifier, "shared"),
        HttpApiEndpoint.get("second", "/second").annotate(OpenApi.Identifier, "shared")
      )
    )

    assert.throws(() => OpenApi.fromApi(Api), /Duplicate OpenAPI operationId: shared/)
  })

  it("allows operations without identifiers", () => {
    const removeOperationId = (operation: Record<string, any>) => {
      const transformed = { ...operation }
      delete transformed.operationId
      return transformed
    }
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("first", "/first").annotate(OpenApi.Transform, removeOperationId),
        HttpApiEndpoint.get("second", "/second").annotate(OpenApi.Transform, removeOperationId)
      )
    )

    const spec = OpenApi.fromApi(Api)
    const first = spec.paths["/first"]?.get
    const second = spec.paths["/second"]?.get

    assert.isDefined(first)
    assert.isDefined(second)
    assert.isFalse(Object.hasOwn(first, "operationId"))
    assert.isFalse(Object.hasOwn(second, "operationId"))
  })

  it("rejects incompatible security schemes with the same name", () => {
    const Api = makeSecurityApi(HeaderAuthA, QueryAuth)

    assert.throws(() => OpenApi.fromApi(Api), /Conflicting OpenAPI security scheme: auth/)
  })

  it("deduplicates equivalent security schemes with the same name", () => {
    const Api = makeSecurityApi(HeaderAuthA, HeaderAuthB)

    const spec = OpenApi.fromApi(Api)

    assert.deepStrictEqual(spec.components.securitySchemes.auth, {
      type: "apiKey",
      name: "x-api-key",
      in: "header"
    })
  })

  it("deduplicates API key header names case-insensitively", () => {
    const Api = makeSecurityApi(HeaderAuthUpper, HeaderAuthA)

    const spec = OpenApi.fromApi(Api)

    assert.deepStrictEqual(spec.components.securitySchemes.auth, {
      type: "apiKey",
      name: "X-API-Key",
      in: "header"
    })
  })

  it("deduplicates HTTP security schemes case-insensitively", () => {
    const Api = makeSecurityApi(TokenAuthUpper, TokenAuthLower)

    const spec = OpenApi.fromApi(Api)

    assert.deepStrictEqual(spec.components.securitySchemes.auth, {
      type: "http",
      scheme: "Token"
    })
  })

  it("stores __proto__ security scheme names as own properties", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("first", "/first").middleware(ProtoHeaderAuth)
      )
    )

    const spec = OpenApi.fromApi(Api)
    const schemes = spec.components.securitySchemes

    assert.isTrue(Object.hasOwn(schemes, "__proto__"))
    assert.deepStrictEqual(Object.keys(schemes), ["__proto__"])
    assert.strictEqual(Object.getPrototypeOf(schemes), Object.prototype)
    assert.deepStrictEqual(schemes["__proto__"], {
      type: "apiKey",
      name: "x-api-key",
      in: "header"
    })
  })

  it("rejects incompatible __proto__ security schemes", () => {
    const Api = makeSecurityApi(ProtoHeaderAuth, ProtoQueryAuth)

    assert.throws(() => OpenApi.fromApi(Api), /Conflicting OpenAPI security scheme: __proto__/)
  })

  it("emits response headers declared with WithHeaders", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.post("create", "/create", {
          success: HttpApiSchema.WithHeaders({
            headers: {
              location: Schema.String,
              "x-request-id": Schema.optional(Schema.String)
            },
            body: HttpApiSchema.Created
          })
        })
      )
    )

    const spec = OpenApi.fromApi(Api)
    const response = spec.paths["/create"]!.post!.responses[201]!

    assert.deepStrictEqual(response.headers, {
      location: { required: true, schema: { type: "string" } },
      "x-request-id": { required: false, schema: { type: "string" } }
    })
  })

  it("marks a response header optional when only some content-types declare it", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("get", "/get", {
          success: [
            Schema.String.pipe(HttpApiSchema.asText()),
            HttpApiSchema.WithHeaders({
              headers: { "x-trace-id": Schema.String },
              body: Schema.Struct({ name: Schema.String })
            })
          ]
        })
      )
    )

    const spec = OpenApi.fromApi(Api)
    const response = spec.paths["/get"]!.get!.responses[200]!

    assert.deepStrictEqual(response.headers, {
      "x-trace-id": { required: false, schema: { type: "string" } }
    })
  })

  it("uses the wrapper status for a status-annotated stream wrapper", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.get("download", "/download", {
          success: HttpApiSchema.status(206)(
            HttpApiSchema.WithHeaders({
              headers: { "content-range": Schema.String },
              body: HttpApiSchema.StreamUint8Array()
            })
          )
        })
      )
    )

    const spec = OpenApi.fromApi(Api)
    const responses = spec.paths["/download"]!.get!.responses

    assert.isUndefined(responses[200])
    const response = responses[206]!
    assert.deepStrictEqual(response.headers, {
      "content-range": { required: true, schema: { type: "string" } }
    })
    assert.deepStrictEqual(Object.keys(response.content!), ["application/octet-stream"])
  })

  // OpenAPI models `Response.headers` as a fixed name -> schema map, so a headers
  // schema with dynamic keys has no representation. It still encodes and decodes
  // at runtime (see HttpApiClient.test.ts), it just contributes no entries here.
  // This mirrors `processParameters`, which bails the same way for request
  // `params` / `query` / `headers` that are not object-shaped.
  it("omits response headers for a headers schema that is not object-shaped", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.post("create", "/create", {
          success: HttpApiSchema.WithHeaders({
            headers: Schema.Record(Schema.String, Schema.String),
            body: HttpApiSchema.Created
          })
        })
      )
    )

    const spec = OpenApi.fromApi(Api)
    const response = spec.paths["/create"]!.post!.responses[201]!

    assert.isUndefined(response.headers)
  })

  it("prefers a description on the wrapper over one on the body", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.post("create", "/create", {
          success: HttpApiSchema.WithHeaders({
            headers: { location: Schema.String },
            body: HttpApiSchema.Created.annotate({ description: "body description" })
          }).annotate({ description: "wrapper description" })
        }),
        HttpApiEndpoint.get("get", "/get", {
          success: HttpApiSchema.WithHeaders({
            headers: { "x-trace-id": Schema.String },
            body: Schema.Struct({ name: Schema.String }).annotate({ description: "body description" })
          }).annotate({ description: "wrapper description" })
        })
      )
    )

    const spec = OpenApi.fromApi(Api)

    assert.strictEqual(spec.paths["/create"]!.post!.responses[201]!.description, "wrapper description")
    assert.strictEqual(spec.paths["/get"]!.get!.responses[200]!.description, "wrapper description")
  })

  it("falls back to the body description when the wrapper has none", () => {
    const Api = HttpApi.make("Api").add(
      HttpApiGroup.make("test").add(
        HttpApiEndpoint.post("create", "/create", {
          success: HttpApiSchema.WithHeaders({
            headers: { location: Schema.String },
            body: HttpApiSchema.Created.annotate({ description: "body description" })
          })
        })
      )
    )

    const spec = OpenApi.fromApi(Api)

    assert.strictEqual(spec.paths["/create"]!.post!.responses[201]!.description, "body description")
  })
})
