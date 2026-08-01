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

describe("WithHeaders responses", () => {
  it("stores a wrapper whose sub-schemas are codecs", () => {
    const endpoint = HttpApiEndpoint.post("create", "/create", {
      success: HttpApiSchema.WithHeaders({
        headers: { location: Schema.String },
        body: HttpApiSchema.Created
      })
    })

    const [success] = Array.from(endpoint.success)
    assert.isTrue(HttpApiSchema.isWithHeaders(success))
    assert.strictEqual(HttpApiSchema.getStatusSuccess(success.ast), 201)
  })

  it("leaves sub-schemas untouched when codecs are disabled", () => {
    const headers = Schema.Struct({ location: Schema.String })
    const body = HttpApiSchema.Created
    const endpoint = HttpApiEndpoint.post("create", "/create", {
      success: HttpApiSchema.WithHeaders({ headers, body }),
      disableCodecs: true
    })

    const [success] = Array.from(endpoint.success) as [
      HttpApiSchema.WithHeaders<Schema.Top, Schema.Top>
    ]
    assert.strictEqual(success.headers, headers)
    assert.strictEqual(success.body, body)
  })

  it("rejects sharing a status and content-type with a plain success", () => {
    assert.throws(
      () =>
        HttpApiEndpoint.get("get", "/get", {
          success: [
            Schema.Struct({ a: Schema.String }),
            HttpApiSchema.WithHeaders({
              headers: { "x-trace-id": Schema.String },
              body: Schema.Struct({ b: Schema.String })
            })
          ]
        }),
      "Cannot combine a WithHeaders response with another response for status 200 and content-type: application/json"
    )
  })

  it("rejects sharing a status and content-type with another WithHeaders", () => {
    assert.throws(
      () =>
        HttpApiEndpoint.get("get", "/get", {
          success: [
            HttpApiSchema.WithHeaders({
              headers: { "x-a": Schema.String },
              body: Schema.Struct({ a: Schema.String })
            }),
            HttpApiSchema.WithHeaders({
              headers: { "x-b": Schema.String },
              body: Schema.Struct({ b: Schema.String })
            })
          ]
        }),
      "Cannot combine a WithHeaders response with another response for status 200 and content-type: application/json"
    )
  })

  it("allows a WithHeaders response at a distinct status", () => {
    const endpoint = HttpApiEndpoint.get("get", "/get", {
      success: [
        Schema.Struct({ a: Schema.String }),
        HttpApiSchema.WithHeaders({
          headers: { location: Schema.String },
          body: HttpApiSchema.Created
        })
      ]
    })

    assert.strictEqual(endpoint.success.size, 2)
  })

  it("allows a WithHeaders response at a distinct content-type", () => {
    const endpoint = HttpApiEndpoint.get("get", "/get", {
      success: [
        Schema.Struct({ a: Schema.String }),
        HttpApiSchema.WithHeaders({
          headers: { "x-trace-id": Schema.String },
          body: Schema.String.pipe(HttpApiSchema.asText())
        })
      ]
    })

    assert.strictEqual(endpoint.success.size, 2)
  })

  it("applies exclusivity to errors", () => {
    assert.throws(
      () =>
        HttpApiEndpoint.get("get", "/get", {
          error: [
            Schema.Struct({ reason: Schema.String }),
            HttpApiSchema.WithHeaders({
              headers: { "retry-after": Schema.String },
              body: Schema.Struct({ cause: Schema.String })
            })
          ]
        }),
      "Cannot combine a WithHeaders response with another response for status 500 and content-type: application/json"
    )
  })

  it("rejects a streaming body in an error response", () => {
    assert.throws(
      () =>
        HttpApiEndpoint.get("get", "/get", {
          error: HttpApiSchema.WithHeaders({
            headers: { "x-trace-id": Schema.String },
            body: HttpApiSchema.StreamUint8Array()
          })
        }),
      "Streaming schemas are not supported in error responses"
    )
  })

  it("accepts a streaming body in a success response", () => {
    const endpoint = HttpApiEndpoint.get("download", "/download", {
      success: HttpApiSchema.WithHeaders({
        headers: { "x-trace-id": Schema.String },
        body: HttpApiSchema.StreamUint8Array({ contentType: "application/custom-bytes" })
      })
    })

    const [success] = Array.from(endpoint.success)
    assert.isTrue(HttpApiSchema.isStreamSchema(HttpApiSchema.unwrapResponseSchema(success)))
  })

  it("streaming success mixed with a WithHeaders buffered success is allowed when the wrapper's content-type differs from the body's", () => {
    const endpoint = HttpApiEndpoint.get("download", "/download", {
      success: [
        HttpApiSchema.StreamUint8Array({ contentType: "application/json" }),
        HttpApiSchema.WithHeaders({
          headers: { "x-a": Schema.String },
          body: Schema.String
        }).pipe(HttpApiSchema.asJson({ contentType: "application/vnd.custom+json" }))
      ]
    })

    assert.strictEqual(endpoint.success.size, 2)
  })
})
