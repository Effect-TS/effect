import { Effect, Layer, Schema, type Stream } from "effect"
import type { Sse } from "effect/unstable/encoding"
import { HttpClient, type HttpClientError, type HttpClientResponse } from "effect/unstable/http"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi"
import { type Atom, AtomHttpApi, AtomRegistry } from "effect/unstable/reactivity"
import { describe, expect, it } from "tstyche"

class EndpointError extends Schema.Error<EndpointError>("EndpointError")({
  _tag: Schema.tag("EndpointError")
}) {}

class MiddlewareError extends Schema.Error<MiddlewareError>("MiddlewareError")({
  _tag: Schema.tag("MiddlewareError")
}) {}

class MiddlewareClientError extends Schema.Error<MiddlewareClientError>("MiddlewareClientError")({
  _tag: Schema.tag("MiddlewareClientError")
}) {}

class TestMiddleware extends HttpApiMiddleware.Service<TestMiddleware, {
  clientError: MiddlewareClientError
}>()("TestMiddleware", {
  error: MiddlewareError,
  requiredForClient: true
}) {}

const Api = HttpApi.make("Api").add(
  HttpApiGroup.make("group").add(
    HttpApiEndpoint.get("get", "/get", {
      success: Schema.String,
      error: EndpointError
    }).middleware(TestMiddleware),
    HttpApiEndpoint.get("sse", "/sse", {
      success: HttpApiSchema.StreamSse({ data: Schema.String })
    }),
    HttpApiEndpoint.get("bytes", "/bytes", {
      success: HttpApiSchema.StreamUint8Array()
    }),
    HttpApiEndpoint.get("headers", "/headers", {
      success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamSse({ data: Schema.String }), {
        "x-count": Schema.Int
      })
    })
  )
)

const Client = AtomHttpApi.Service()("Client", {
  api: Api,
  httpClient: Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die("not used")))
})

type InnerError = HttpClientError.HttpClientError | Schema.SchemaError | Sse.Retry | Sse.SseError
type SseStream = Stream.Stream<string, InnerError>

describe("AtomHttpApi", () => {
  it("exposes SSE options only when a success variant is SSE", () => {
    const sse = HttpApiSchema.StreamSse({ data: Schema.String })
    const StreamingClient = AtomHttpApi.Service()("StreamingClient", {
      api: HttpApi.make("StreamingApi").add(
        HttpApiGroup.make("group").add(
          HttpApiEndpoint.get("withHeaders", "/with-headers", {
            success: HttpApiSchema.WithHeaders(sse, { "x-count": Schema.Int })
          }),
          HttpApiEndpoint.get("mixed", "/mixed", { success: [Schema.String, sse] }),
          HttpApiEndpoint.get("mixedWithHeaders", "/mixed-with-headers", {
            params: { id: Schema.String },
            success: [Schema.String, HttpApiSchema.WithHeaders(sse, { "x-count": Schema.Int })]
          }),
          HttpApiEndpoint.get("json", "/json", { success: Schema.String }),
          HttpApiEndpoint.get("jsonWithHeaders", "/json-with-headers", {
            success: HttpApiSchema.WithHeaders(Schema.String, { "x-count": Schema.Int })
          }),
          HttpApiEndpoint.get("bytes", "/bytes", { success: HttpApiSchema.StreamUint8Array() }),
          HttpApiEndpoint.get("bytesWithHeaders", "/bytes-with-headers", {
            success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamUint8Array(), { "x-count": Schema.Int })
          })
        )
      ),
      httpClient: Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die("not used")))
    })
    const sseOptions = { maxEventSize: 4 }
    expect(StreamingClient.query).type.toBeCallableWith("group", "withHeaders", { sseOptions })
    expect(StreamingClient.query).type.toBeCallableWith("group", "mixed", { sseOptions })
    expect(StreamingClient.query).type.toBeCallableWith("group", "mixedWithHeaders", {
      params: { id: "1" },
      sseOptions
    })
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "mixedWithHeaders", { sseOptions })
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "json", { sseOptions })
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "jsonWithHeaders", { sseOptions })
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "bytes", { sseOptions })
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "bytesWithHeaders", { sseOptions })

    const withHeaders = StreamingClient.mutation("group", "withHeaders")
    const mixed = StreamingClient.mutation("group", "mixed")
    const mixedWithHeaders = StreamingClient.mutation("group", "mixedWithHeaders")
    const registry = AtomRegistry.make()
    expect(registry.set(withHeaders, { sseOptions })).type.toBe<void>()
    expect(registry.set(mixed, { sseOptions })).type.toBe<void>()
    expect(registry.set(mixedWithHeaders, { params: { id: "1" }, sseOptions })).type.toBe<void>()

    const json = StreamingClient.mutation("group", "json")
    const jsonWithHeaders = StreamingClient.mutation("group", "jsonWithHeaders")
    const bytes = StreamingClient.mutation("group", "bytes")
    const bytesWithHeaders = StreamingClient.mutation("group", "bytesWithHeaders")
    expect<Extract<Parameters<typeof json.write>[1], object>>().type.not.toHaveProperty("sseOptions")
    expect<Extract<Parameters<typeof jsonWithHeaders.write>[1], object>>().type.not.toHaveProperty("sseOptions")
    expect<Extract<Parameters<typeof bytes.write>[1], object>>().type.not.toHaveProperty("sseOptions")
    expect<Extract<Parameters<typeof bytesWithHeaders.write>[1], object>>().type.not.toHaveProperty("sseOptions")
    expect(registry.set).type.not.toBeCallableWith(json, { sseOptions })
    expect(registry.set).type.not.toBeCallableWith(jsonWithHeaders, { sseOptions })
    expect(registry.set).type.not.toBeCallableWith(bytes, { sseOptions })
    expect(registry.set).type.not.toBeCallableWith(bytesWithHeaders, { sseOptions })
  })

  it("accepts SSE decode options in query and mutation requests", () => {
    const StreamingClient = AtomHttpApi.Service()("StreamingClient", {
      api: HttpApi.make("StreamingApi").add(
        HttpApiGroup.make("group").add(
          HttpApiEndpoint.get("events", "/events", {
            params: { id: Schema.String },
            success: HttpApiSchema.StreamSse({ data: Schema.String })
          })
        )
      ),
      httpClient: Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die("not used")))
    })
    const defaults = StreamingClient.query("group", "events", { params: { id: "1" } })
    const query = StreamingClient.query("group", "events", {
      params: { id: "1" },
      sseOptions: { maxEventSize: 4 }
    })
    expect(query).type.toBe<typeof defaults>()
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "events", {
      params: { id: "1" },
      sseOptions: { maxEventSize: "4" }
    })
    expect(StreamingClient.query).type.not.toBeCallableWith("group", "events", { sseOptions: {} })

    const mutation = StreamingClient.mutation("group", "events", { responseMode: "decoded-only" })
    const request: Extract<Parameters<typeof mutation.write>[1], { readonly params: unknown }> = {
      params: { id: "1" },
      sseOptions: { maxEventSize: Infinity }
    }
    const registry = AtomRegistry.make()
    expect(registry.set(mutation, request)).type.toBe<void>()
    expect(registry.set).type.not.toBeCallableWith(mutation, {
      params: { id: "1" },
      sseOptions: { maxEventSize: "4" }
    })
    expect(registry.set).type.not.toBeCallableWith(mutation, { sseOptions: {} })
  })

  it("should include middleware errors in query and mutation atoms", () => {
    const mutation = Client.mutation("group", "get")
    const query = Client.query("group", "get", {})

    expect<Atom.Failure<typeof mutation>>().type.toBe<
      EndpointError | MiddlewareError | MiddlewareClientError
    >()

    expect<Atom.Failure<typeof query>>().type.toBe<
      EndpointError | MiddlewareError | MiddlewareClientError
    >()
  })

  it("should mirror HttpApiClient response-only error behavior", () => {
    const mutation = Client.mutation("group", "get", {
      responseMode: "response-only"
    })

    expect<Atom.Failure<typeof mutation>>().type.toBe<
      MiddlewareError | MiddlewareClientError
    >()
  })

  it("should expose generated SSE stream errors from queries", () => {
    const query = Client.query("group", "sse", {})

    expect<Atom.Success<typeof query>>().type.toBe<SseStream>()
  })

  it("should pair the stream with the response in decoded-and-response mode", () => {
    const mutation = Client.mutation("group", "sse", { responseMode: "decoded-and-response" })

    expect<Atom.Success<typeof mutation>>().type.toBe<
      [SseStream, HttpClientResponse.HttpClientResponse]
    >()
  })

  it("should expose generated binary stream errors from mutations", () => {
    const mutation = Client.mutation("group", "bytes")

    expect<Atom.Success<typeof mutation>>().type.toBe<
      Stream.Stream<Uint8Array, HttpClientError.HttpClientError>
    >()
  })

  it("should expose generated stream errors through response headers", () => {
    const query = Client.query("group", "headers", {})

    expect<Atom.Success<typeof query>>().type.toBe<
      HttpApiSchema.withHeaders<SseStream, { readonly "x-count": number }>
    >()
  })
})
