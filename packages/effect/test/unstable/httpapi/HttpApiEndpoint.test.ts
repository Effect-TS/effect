import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiSchema } from "effect/unstable/httpapi"

const Events = Schema.Struct({
  event: Schema.Literal("user.created"),
  data: Schema.String
})
const StreamError = Schema.Struct({ reason: Schema.String })

const sse = () => HttpApiSchema.StreamSse({ events: Events, error: StreamError })

describe("HttpApiEndpoint", () => {
  it("stores the supplied identifier", () => {
    const endpoint = HttpApiEndpoint.get("getUser", "/users/:id")

    assert.strictEqual(endpoint.identifier, "getUser")
  })

  it("can be extended as a class", () => {
    const endpoint = HttpApiEndpoint.get("getUser", "/users/:id")
    class GetUser extends endpoint {}

    assert.strictEqual(typeof endpoint, "function")
    assert.strictEqual(GetUser.name, "GetUser")
    assert.strictEqual(GetUser.identifier, "getUser")
    assert.isTrue(HttpApiEndpoint.isHttpApiEndpoint(GetUser))

    const prefixed = GetUser.prefix("/v1")
    assert.strictEqual(prefixed.identifier, "getUser")
    assert.strictEqual(prefixed.path, "/v1/users/:id")
  })
})

describe("HttpApiEndpoint payload schemas", () => {
  it("normalizes payload map keys while preserving the declared content type", () => {
    const contentType = "Application/Vnd.Effect+JSON; Charset=UTF-8"
    const endpoint = HttpApiEndpoint.post("create", "/", {
      payload: Schema.Struct({ name: Schema.String }).pipe(HttpApiSchema.asJson({ contentType }))
    })

    const entry = endpoint.payload.get("application/vnd.effect+json")
    assert.isDefined(entry)
    assert.strictEqual(entry.encoding.contentType, contentType)
  })

  it("rejects incompatible encodings for equivalent content types", () => {
    const JsonPayload = Schema.Struct({ name: Schema.String }).pipe(
      HttpApiSchema.asJson({ contentType: "Application/Vnd.Effect+Data; charset=utf-8" })
    )
    const TextPayload = Schema.String.pipe(
      HttpApiSchema.asText({ contentType: "application/vnd.effect+data" })
    )

    assert.throws(
      () => HttpApiEndpoint.post("create", "/", { payload: [JsonPayload, TextPayload] }),
      /Multiple payload encodings/
    )
  })
})

describe("HttpApiEndpoint streaming success schemas", () => {
  it("GET endpoint accepts StreamSse success", () => {
    const stream = sse()
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: stream
    })

    assert.isTrue(endpoint.success.has(stream))
  })

  it("GET endpoint accepts StreamUint8Array success", () => {
    const stream = HttpApiSchema.StreamUint8Array()
    const endpoint = HttpApiEndpoint.get("download", "/download", {
      success: stream
    })

    assert.isTrue(endpoint.success.has(stream))
  })

  it("streaming schema in error throws during endpoint construction", () => {
    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        error: sse() as any
      })
    )
  })

  it("HEAD with streaming success throws", () => {
    assert.throws(() =>
      HttpApiEndpoint.head("events", "/events", {
        success: sse()
      })
    )
  })

  it("streaming success mixed with NoContent at the same status throws", () => {
    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: [
          sse(),
          HttpApiSchema.NoContent.pipe(HttpApiSchema.status(200))
        ]
      })
    )
  })

  it("streaming success mixed with a buffered success at the same status is allowed for distinct content types", () => {
    const stream = sse()
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: [
        stream,
        Schema.Struct({ ok: Schema.Boolean })
      ]
    })

    assert.isTrue(endpoint.success.has(stream))
  })

  it("streaming success mixed with a buffered success at the same content type throws", () => {
    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: [
          HttpApiSchema.StreamSse({ contentType: "application/json", events: Events, error: StreamError }),
          Schema.Struct({ ok: Schema.Boolean })
        ]
      })
    )
  })

  it("streaming success mixed with a buffered success at content types differing only by parameters throws", () => {
    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: [
          HttpApiSchema.StreamSse({
            contentType: "application/json; charset=utf-8",
            events: Events,
            error: StreamError
          }),
          Schema.Struct({ ok: Schema.Boolean })
        ]
      })
    )
  })

  it("streaming success mixed with a buffered success at distinct statuses is allowed", () => {
    const stream = HttpApiSchema.status(206)(sse())
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: [
        stream,
        Schema.Struct({ ok: Schema.Boolean })
      ]
    })

    assert.isTrue(endpoint.success.has(stream))
  })

  it("streaming success mixed with NoContent at distinct statuses is allowed", () => {
    const stream = HttpApiSchema.status(200)(sse())
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: [
        stream,
        HttpApiSchema.NoContent
      ]
    })

    assert.isTrue(endpoint.success.has(stream))
  })

  it("two streaming successes for the same status throw", () => {
    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: [
          sse(),
          HttpApiSchema.StreamUint8Array({ contentType: "application/custom-stream" })
        ]
      })
    )
  })

  it("two streaming successes for distinct statuses are allowed", () => {
    const stream = HttpApiSchema.status(206)(sse())
    const bytes = HttpApiSchema.status(200)(
      HttpApiSchema.StreamUint8Array({ contentType: "application/custom-stream" })
    )
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: [stream, bytes]
    })

    assert.isTrue(endpoint.success.has(stream))
    assert.isTrue(endpoint.success.has(bytes))
  })

  it("statically detectable SSE reserved failure event name throws", () => {
    const stream = HttpApiSchema.StreamSse({
      events: Schema.Struct({
        event: Schema.Literal("effect/httpapi/stream/failure"),
        data: Schema.String
      }),
      error: StreamError
    })

    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: stream
      })
    )
  })
})

describe("HttpApiEndpoint WithHeaders schemas", () => {
  it("keeps the wrapper in the success set with codec-transformed parts", () => {
    const endpoint = HttpApiEndpoint.get("list", "/users", {
      success: HttpApiSchema.WithHeaders(Schema.Struct({ a: Schema.String }), {
        "x-count": Schema.Int
      })
    })

    const [schema] = Array.from(endpoint.success)
    assert.isTrue(HttpApiSchema.isWithHeaders(schema))
    if (HttpApiSchema.isWithHeaders(schema)) {
      assert.deepStrictEqual(
        Schema.encodeSync(schema.headers as any)({ "x-count": 3 }),
        { "x-count": "3" }
      )
    }
  })

  it("leaves the wrapper untouched when codecs are disabled", () => {
    const wrapped = HttpApiSchema.WithHeaders(Schema.Struct({ a: Schema.String }), {
      "x-count": Schema.Int
    })
    const endpoint = HttpApiEndpoint.get("list", "/users", {
      disableCodecs: true,
      success: wrapped
    })

    assert.isTrue(endpoint.success.has(wrapped))
  })

  it("keeps a wrapped stream schema as the inner schema", () => {
    const stream = sse()
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: HttpApiSchema.WithHeaders(stream, { "x-count": Schema.Int })
    })

    const [schema] = Array.from(endpoint.success)
    assert.isTrue(HttpApiSchema.isWithHeaders(schema))
    if (HttpApiSchema.isWithHeaders(schema)) {
      assert.strictEqual(schema.schema, stream)
    }
  })

  it("preserves wrapper annotations through endpoint construction", () => {
    const endpoint = HttpApiEndpoint.get("list", "/users", {
      success: HttpApiSchema.WithHeaders(Schema.Struct({ a: Schema.String }), {
        "x-count": Schema.Int
      }).pipe(HttpApiSchema.status(201))
    })

    const [schema] = Array.from(endpoint.success)
    assert.strictEqual(HttpApiSchema.getStatusSuccessSchema(schema), 201)
  })

  it("validates a wrapped stream like a bare stream", () => {
    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: [
          HttpApiSchema.WithHeaders(sse(), { "x-count": Schema.Int }),
          HttpApiSchema.StreamUint8Array({ contentType: "application/custom-stream" })
        ]
      })
    )
    assert.throws(() =>
      HttpApiEndpoint.head("events", "/events", {
        success: HttpApiSchema.WithHeaders(sse(), { "x-count": Schema.Int }) as any
      })
    )
  })

  it("resolves the status from the wrapper when validating per-status combinations", () => {
    const wrapped = HttpApiSchema.WithHeaders(sse(), { "x-count": Schema.Int })
      .pipe(HttpApiSchema.status(206))
    const endpoint = HttpApiEndpoint.get("events", "/events", {
      success: [wrapped, sse()]
    })

    assert.strictEqual(endpoint.success.size, 2)

    assert.throws(() =>
      HttpApiEndpoint.get("events", "/events", {
        success: [
          HttpApiSchema.WithHeaders(sse(), { "x-count": Schema.Int }),
          sse()
        ]
      })
    )
  })

  it("keeps WithHeaders in the error set with codec-transformed parts", () => {
    const endpoint = HttpApiEndpoint.get("list", "/users", {
      error: HttpApiSchema.WithHeaders(
        Schema.Struct({ message: Schema.String }).pipe(HttpApiSchema.status(429)),
        { "retry-after": Schema.Int }
      )
    })

    const [schema] = Array.from(endpoint.error)
    assert.isTrue(HttpApiSchema.isWithHeaders(schema))
    assert.strictEqual(HttpApiSchema.getStatusErrorSchema(schema), 429)
    if (HttpApiSchema.isWithHeaders(schema)) {
      assert.deepStrictEqual(
        Schema.encodeSync(schema.headers as any)({ "retry-after": 30 }),
        { "retry-after": "30" }
      )
    }
  })
})
