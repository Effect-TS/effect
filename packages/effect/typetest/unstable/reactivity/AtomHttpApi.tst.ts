import { Effect, Layer, Schema, type Stream } from "effect"
import type { Sse } from "effect/unstable/encoding"
import { HttpClient, type HttpClientError, type HttpClientResponse } from "effect/unstable/http"
import {
  HttpApi,
  type HttpApiClient,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema
} from "effect/unstable/httpapi"
import { type Atom, AtomHttpApi } from "effect/unstable/reactivity"
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
    }).middleware(TestMiddleware)
  )
)

const Client = AtomHttpApi.Service()("Client", {
  api: Api,
  httpClient: Layer.succeed(HttpClient.HttpClient, HttpClient.make(() => Effect.die("not used")))
})

class DeclaredError extends Schema.Error<DeclaredError>("DeclaredError")({ _tag: Schema.tag("DeclaredError") }) {}
class StreamError extends Schema.Error<StreamError>("StreamError")({ _tag: Schema.tag("StreamError") }) {}
const streamGroup = HttpApiGroup.make("events").add(
  HttpApiEndpoint.get("data", "/data", { success: HttpApiSchema.StreamSse({ data: Schema.String }) }),
  HttpApiEndpoint.get("declared", "/declared", {
    success: HttpApiSchema.StreamSse({ data: Schema.String, error: StreamError }),
    error: DeclaredError
  }),
  HttpApiEndpoint.get("events", "/events", {
    success: HttpApiSchema.StreamSse({
      events: Schema.Struct({ event: Schema.Literal("message"), data: Schema.String })
    })
  }),
  HttpApiEndpoint.get("headers", "/headers", {
    success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamSse({ data: Schema.String, error: StreamError }), {
      "x-count": Schema.Int
    })
  }),
  HttpApiEndpoint.get("bytes", "/bytes", { success: HttpApiSchema.StreamUint8Array() }),
  HttpApiEndpoint.get("byteHeaders", "/byte-headers", {
    success: HttpApiSchema.WithHeaders(HttpApiSchema.StreamUint8Array(), { "x-count": Schema.Int })
  }),
  HttpApiEndpoint.get("ordinary", "/ordinary", { success: Schema.String, error: DeclaredError }),
  HttpApiEndpoint.get("union", "/union", { success: [Schema.String, HttpApiSchema.StreamSse({ data: Schema.String })] })
)
declare const streamClient: AtomHttpApi.AtomHttpApiClient<never, "Client", typeof streamGroup>
declare const directClient: HttpApiClient.Client<typeof streamGroup>
type Response = HttpClientResponse.HttpClientResponse
type InnerError = HttpClientError.HttpClientError | Schema.SchemaError | Sse.Retry | Sse.SseError
type DataStream = Stream.Stream<string, InnerError>
type DeclaredStream = Stream.Stream<string, InnerError | StreamError>

describe("AtomHttpApi", () => {
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

  describe("generated stream success types", () => {
    it("keeps SSE errors inside the successful stream in all response modes", () => {
      const query = streamClient.query("events", "data", {})
      const mutation = streamClient.mutation("events", "data")
      // Select query modes explicitly: inference through the conditional request type is a separate concern.
      const queryBoth = streamClient.query<
        "events",
        "data",
        typeof streamGroup,
        typeof streamGroup.endpoints.data,
        "decoded-and-response"
      >("events", "data", { responseMode: "decoded-and-response" })
      const mutationBoth = streamClient.mutation("events", "data", { responseMode: "decoded-and-response" })
      const queryRaw = streamClient.query<
        "events",
        "data",
        typeof streamGroup,
        typeof streamGroup.endpoints.data,
        "response-only"
      >("events", "data", { responseMode: "response-only" })
      const mutationRaw = streamClient.mutation("events", "data", { responseMode: "response-only" })
      const directResult = directClient.events.data({})
      expect<Atom.Success<typeof query>>().type.toBe<DataStream>()
      expect<Atom.Success<typeof mutation>>().type.toBe<DataStream>()
      expect<Atom.Success<typeof queryBoth>>().type.toBe<[DataStream, Response]>()
      expect<Atom.Success<typeof mutationBoth>>().type.toBe<[DataStream, Response]>()
      expect<Atom.Success<typeof queryRaw>>().type.toBe<Response>()
      expect<Atom.Success<typeof mutationRaw>>().type.toBe<Response>()
      expect<Atom.Failure<typeof query>>().type.toBe<never>()
      expect<Atom.Failure<typeof mutation>>().type.toBe<never>()
      expect<Effect.Success<typeof directResult>>().type.toBe<DataStream>()
    })

    it("retains declared stream errors separately from endpoint errors", () => {
      const query = streamClient.query("events", "declared", {})
      const mutation = streamClient.mutation("events", "declared")
      const directResult = directClient.events.declared({})
      expect<Atom.Success<typeof query>>().type.toBe<DeclaredStream>()
      expect<Atom.Success<typeof mutation>>().type.toBe<DeclaredStream>()
      expect<Atom.Failure<typeof query>>().type.toBe<DeclaredError>()
      expect<Atom.Failure<typeof mutation>>().type.toBe<DeclaredError>()
      expect<Effect.Success<typeof directResult>>().type.toBe<DeclaredStream>()
    })

    it("preserves event-mode values", () => {
      type Events = Stream.Stream<{ readonly event: "message"; readonly data: string }, InnerError>
      const query = streamClient.query("events", "events", {})
      const mutation = streamClient.mutation("events", "events")
      const directResult = directClient.events.events({})
      expect<Atom.Success<typeof query>>().type.toBe<Events>()
      expect<Atom.Success<typeof mutation>>().type.toBe<Events>()
      expect<Effect.Success<typeof directResult>>().type.toBe<Events>()
    })

    it("recursively maps WithHeaders without moving failures outside its body", () => {
      type Headers = HttpApiSchema.withHeaders<DeclaredStream, { readonly "x-count": number }>
      const query = streamClient.query("events", "headers", {})
      const mutation = streamClient.mutation("events", "headers", { responseMode: "decoded-and-response" })
      const directResult = directClient.events.headers({})
      expect<Atom.Success<typeof query>>().type.toBe<Headers>()
      expect<Atom.Success<typeof mutation>>().type.toBe<[Headers, Response]>()
      expect<Atom.Failure<typeof query>>().type.toBe<never>()
      expect<Effect.Success<typeof directResult>>().type.toBe<Headers>()
    })

    it("retains binary transport errors with and without headers", () => {
      type Bytes = Stream.Stream<Uint8Array, HttpClientError.HttpClientError>
      type Headers = HttpApiSchema.withHeaders<Bytes, { readonly "x-count": number }>
      const query = streamClient.query("events", "bytes", {})
      const mutation = streamClient.mutation("events", "bytes")
      const queryHeaders = streamClient.query("events", "byteHeaders", {})
      const mutationHeaders = streamClient.mutation("events", "byteHeaders")
      const directResult = directClient.events.bytes({})
      expect<Atom.Success<typeof query>>().type.toBe<Bytes>()
      expect<Atom.Success<typeof mutation>>().type.toBe<Bytes>()
      expect<Atom.Success<typeof queryHeaders>>().type.toBe<Headers>()
      expect<Atom.Success<typeof mutationHeaders>>().type.toBe<Headers>()
      expect<Effect.Success<typeof directResult>>().type.toBe<Bytes>()
    })

    it("preserves ordinary successes and outer response-only error conversion", () => {
      const query = streamClient.query("events", "ordinary", {})
      const mutation = streamClient.mutation("events", "ordinary")
      const queryBoth = streamClient.query<
        "events",
        "ordinary",
        typeof streamGroup,
        typeof streamGroup.endpoints.ordinary,
        "decoded-and-response"
      >("events", "ordinary", { responseMode: "decoded-and-response" })
      const mutationBoth = streamClient.mutation("events", "ordinary", { responseMode: "decoded-and-response" })
      const queryRaw = streamClient.query<
        "events",
        "ordinary",
        typeof streamGroup,
        typeof streamGroup.endpoints.ordinary,
        "response-only"
      >("events", "ordinary", { responseMode: "response-only" })
      const mutationRaw = streamClient.mutation("events", "ordinary", { responseMode: "response-only" })
      expect<Atom.Success<typeof query>>().type.toBe<string>()
      expect<Atom.Success<typeof mutation>>().type.toBe<string>()
      expect<Atom.Success<typeof queryBoth>>().type.toBe<[string, Response]>()
      expect<Atom.Success<typeof mutationBoth>>().type.toBe<[string, Response]>()
      expect<Atom.Success<typeof queryRaw>>().type.toBe<Response>()
      expect<Atom.Success<typeof mutationRaw>>().type.toBe<Response>()
      expect<Atom.Failure<typeof query>>().type.toBe<DeclaredError>()
      expect<Atom.Failure<typeof mutation>>().type.toBe<DeclaredError>()
      expect<Atom.Failure<typeof queryRaw>>().type.toBe<never>()
      expect<Atom.Failure<typeof mutationRaw>>().type.toBe<never>()
    })

    it("preserves unions of ordinary and streaming successes", () => {
      const query = streamClient.query("events", "union", {})
      const mutation = streamClient.mutation("events", "union")
      const directResult = directClient.events.union({})
      expect<Atom.Success<typeof query>>().type.toBe<string | DataStream>()
      expect<Atom.Success<typeof mutation>>().type.toBe<string | DataStream>()
      expect<Effect.Success<typeof directResult>>().type.toBe<string | DataStream>()
    })
  })
})
