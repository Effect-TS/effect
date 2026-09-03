import { type Effect, Schema, type Stream } from "effect"
import type { Sse } from "effect/unstable/encoding"
import type { HttpClientError, HttpClientResponse } from "effect/unstable/http"
import { type HttpApiClient, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi"
import type { Atom, AtomHttpApi } from "effect/unstable/reactivity"
import { describe, expect, it } from "tstyche"

class DeclaredError extends Schema.Error<DeclaredError>("DeclaredError")({ _tag: Schema.tag("DeclaredError") }) {}
class StreamError extends Schema.Error<StreamError>("StreamError")({ _tag: Schema.tag("StreamError") }) {}
const group = HttpApiGroup.make("events").add(
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
declare const client: AtomHttpApi.AtomHttpApiClient<never, "Client", typeof group>
declare const direct: HttpApiClient.Client<typeof group>
type Response = HttpClientResponse.HttpClientResponse
type InnerError = HttpClientError.HttpClientError | Schema.SchemaError | Sse.Retry | Sse.SseError
type DataStream = Stream.Stream<string, InnerError>
type DeclaredStream = Stream.Stream<string, InnerError | StreamError>

describe("AtomHttpApi generated stream success types", () => {
  it("keeps SSE errors inside the successful stream in all response modes", () => {
    const query = client.query("events", "data", {})
    const mutation = client.mutation("events", "data")
    // Select query modes explicitly: inference through the conditional request type is a separate concern.
    const queryBoth = client.query<"events", "data", typeof group, typeof group.endpoints.data, "decoded-and-response">(
      "events",
      "data",
      { responseMode: "decoded-and-response" }
    )
    const mutationBoth = client.mutation("events", "data", { responseMode: "decoded-and-response" })
    const queryRaw = client.query<"events", "data", typeof group, typeof group.endpoints.data, "response-only">(
      "events",
      "data",
      { responseMode: "response-only" }
    )
    const mutationRaw = client.mutation("events", "data", { responseMode: "response-only" })
    const directResult = direct.events.data({})
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
    const query = client.query("events", "declared", {})
    const mutation = client.mutation("events", "declared")
    const directResult = direct.events.declared({})
    expect<Atom.Success<typeof query>>().type.toBe<DeclaredStream>()
    expect<Atom.Success<typeof mutation>>().type.toBe<DeclaredStream>()
    expect<Atom.Failure<typeof query>>().type.toBe<DeclaredError>()
    expect<Atom.Failure<typeof mutation>>().type.toBe<DeclaredError>()
    expect<Effect.Success<typeof directResult>>().type.toBe<DeclaredStream>()
  })

  it("preserves event-mode values", () => {
    type Events = Stream.Stream<{ readonly event: "message"; readonly data: string }, InnerError>
    const query = client.query("events", "events", {})
    const mutation = client.mutation("events", "events")
    const directResult = direct.events.events({})
    expect<Atom.Success<typeof query>>().type.toBe<Events>()
    expect<Atom.Success<typeof mutation>>().type.toBe<Events>()
    expect<Effect.Success<typeof directResult>>().type.toBe<Events>()
  })

  it("recursively maps WithHeaders without moving failures outside its body", () => {
    type Headers = HttpApiSchema.withHeaders<DeclaredStream, { readonly "x-count": number }>
    const query = client.query("events", "headers", {})
    const mutation = client.mutation("events", "headers", { responseMode: "decoded-and-response" })
    const directResult = direct.events.headers({})
    expect<Atom.Success<typeof query>>().type.toBe<Headers>()
    expect<Atom.Success<typeof mutation>>().type.toBe<[Headers, Response]>()
    expect<Atom.Failure<typeof query>>().type.toBe<never>()
    expect<Effect.Success<typeof directResult>>().type.toBe<Headers>()
  })

  it("retains binary transport errors with and without headers", () => {
    type Bytes = Stream.Stream<Uint8Array, HttpClientError.HttpClientError>
    type Headers = HttpApiSchema.withHeaders<Bytes, { readonly "x-count": number }>
    const query = client.query("events", "bytes", {})
    const mutation = client.mutation("events", "bytes")
    const queryHeaders = client.query("events", "byteHeaders", {})
    const mutationHeaders = client.mutation("events", "byteHeaders")
    const directResult = direct.events.bytes({})
    expect<Atom.Success<typeof query>>().type.toBe<Bytes>()
    expect<Atom.Success<typeof mutation>>().type.toBe<Bytes>()
    expect<Atom.Success<typeof queryHeaders>>().type.toBe<Headers>()
    expect<Atom.Success<typeof mutationHeaders>>().type.toBe<Headers>()
    expect<Effect.Success<typeof directResult>>().type.toBe<Bytes>()
  })

  it("preserves ordinary successes and outer response-only error conversion", () => {
    const query = client.query("events", "ordinary", {})
    const mutation = client.mutation("events", "ordinary")
    const queryBoth = client.query<
      "events",
      "ordinary",
      typeof group,
      typeof group.endpoints.ordinary,
      "decoded-and-response"
    >("events", "ordinary", { responseMode: "decoded-and-response" })
    const mutationBoth = client.mutation("events", "ordinary", { responseMode: "decoded-and-response" })
    const queryRaw = client.query<"events", "ordinary", typeof group, typeof group.endpoints.ordinary, "response-only">(
      "events",
      "ordinary",
      { responseMode: "response-only" }
    )
    const mutationRaw = client.mutation("events", "ordinary", { responseMode: "response-only" })
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
    const query = client.query("events", "union", {})
    const mutation = client.mutation("events", "union")
    const directResult = direct.events.union({})
    expect<Atom.Success<typeof query>>().type.toBe<string | DataStream>()
    expect<Atom.Success<typeof mutation>>().type.toBe<string | DataStream>()
    expect<Effect.Success<typeof directResult>>().type.toBe<string | DataStream>()
  })
})
