/**
 * The raw transport under `GraphQLClient`.
 *
 * **Details**
 *
 * A `GraphQLProtocol` takes an already-encoded request and returns the raw
 * `ExecutionResult`. It knows nothing about operations, Schemas or middleware;
 * those live in `GraphQLClient`. `layerHttp` is the HTTP transport for queries
 * and mutations. The graphql-ws and graphql-sse transports are added
 * separately.
 *
 * @stability experimental
 * @since 4.0.0
 */
import * as Clock from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as HttpClient from "../http/HttpClient.ts"
import * as HttpClientError from "../http/HttpClientError.ts"
import * as HttpClientRequest from "../http/HttpClientRequest.ts"
import * as HttpClientResponse from "../http/HttpClientResponse.ts"
import * as Layer from "../Layer.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import { GraphQLError, TransportError } from "./GraphQLClientError.ts"

/**
 * The request a transport sends. Middleware sees and may rewrite it before it
 * reaches the transport.
 *
 * **Details**
 *
 * `variables` are already encoded through the operation's variables Schema.
 * `headers` are applied by the HTTP transport; a WebSocket transport ignores
 * them because graphql-ws has no per-operation headers.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface GraphQLRequest {
  readonly query: string
  readonly operationName: string
  readonly variables: unknown
  readonly extensions?: Record<string, unknown> | undefined
  readonly headers: Readonly<Record<string, string>>
}

/**
 * The raw result of executing a GraphQL operation, before `data` is decoded
 * with the result Schema. Middleware receive this from `next`, which is how
 * they read response `extensions` such as a rate-limit cost.
 *
 * @stability experimental
 * @category schemas
 * @since 4.0.0
 */
export const ExecutionResult = Schema.Struct({
  data: Schema.optional(Schema.Unknown),
  errors: Schema.optional(Schema.Array(GraphQLError)),
  extensions: Schema.optional(Schema.Record(Schema.String, Schema.Json))
})

/**
 * The decoded type of {@link ExecutionResult}.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type ExecutionResult = typeof ExecutionResult.Type

/**
 * The transport service. `execute` answers a query or mutation with the raw
 * JSON body, and `subscribe` turns a subscription into a stream of raw events.
 * Both fail only with `TransportError`; GraphQL `errors` are left in the body
 * for the client to interpret.
 *
 * **Example** (A scripted transport for tests)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema, Stream } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * const Scripted = Layer.succeed(GraphQLProtocol.GraphQLProtocol, {
 *   execute: () => Effect.succeed({ data: { viewer: { login: "tim" } } }),
 *   subscribe: () => Stream.empty
 * })
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Viewer))
 *   return yield* client.Viewer()
 * })
 *
 * await Effect.runPromise(program.pipe(Effect.provide(Scripted))) // => { viewer: { login: "tim" } }
 * ```
 *
 * @stability experimental
 * @category services
 * @since 4.0.0
 */
export class GraphQLProtocol extends Context.Service<GraphQLProtocol, {
  readonly execute: (request: GraphQLRequest) => Effect.Effect<unknown, TransportError>
  readonly subscribe: (request: GraphQLRequest) => Stream.Stream<unknown, TransportError>
}>()("effect/graphql/GraphQLProtocol") {}

const graphqlResponseContentType = "application/graphql-response+json"
const jsonContentType = "application/json"

const isGraphQLBody = (body: unknown): boolean =>
  typeof body === "object" && body !== null && !Array.isArray(body) && ("data" in body || "errors" in body)

/**
 * Builds the HTTP transport as an effect, for composing transports by hand.
 * Most code uses {@link layerHttp}.
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const makeHttp = (options: {
  readonly url: string
}): Effect.Effect<GraphQLProtocol["Service"], never, HttpClient.HttpClient> =>
  Effect.map(HttpClient.HttpClient, (client) => {
    const execute = Effect.fnUntraced(function*(request: GraphQLRequest) {
      const now = yield* Clock.currentTimeMillis
      const httpRequest = HttpClientRequest.post(options.url).pipe(
        HttpClientRequest.setHeaders(request.headers),
        HttpClientRequest.setHeader("accept", `${graphqlResponseContentType}, ${jsonContentType}`),
        HttpClientRequest.bodyJsonUnsafe({
          query: request.query,
          operationName: request.operationName,
          variables: request.variables,
          extensions: request.extensions
        })
      )
      const response = yield* client.execute(httpRequest).pipe(
        Effect.flatMap((response) => {
          const contentType = response.headers["content-type"] ?? ""
          // The GraphQL-over-HTTP media type is authoritative, whatever the status.
          if (contentType.includes(graphqlResponseContentType)) {
            return response.json
          }
          // Legacy servers answer with application/json; only a body with the
          // GraphQL keys counts as a GraphQL response.
          if (contentType.includes(jsonContentType)) {
            return Effect.flatMap(response.json, (body) =>
              isGraphQLBody(body)
                ? Effect.succeed(body)
                : Effect.as(HttpClientResponse.filterStatusOk(response), body))
          }
          return Effect.flatMap(
            HttpClientResponse.filterStatusOk(response),
            () =>
              Effect.fail(
                new TransportError({
                  description: `Expected a GraphQL response, received ${
                    contentType === "" ? "no Content-Type" : `Content-Type ${contentType}`
                  }`,
                  status: response.status
                })
              )
          )
        }),
        Effect.catch((error) =>
          Effect.fail(
            HttpClientError.isHttpClientError(error) ? TransportError.fromHttpClientError(error, { now }) : error
          )
        )
      )
      return response
    })
    return GraphQLProtocol.of({
      execute,
      subscribe: () =>
        Stream.die(
          "GraphQLProtocol.layerHttp does not support subscriptions yet; the graphql-sse and graphql-ws transports are a separate slice"
        )
    })
  })

/**
 * The HTTP transport: queries and mutations are sent as `POST` with a JSON
 * body to `url`, using the `HttpClient` in context.
 *
 * **Details**
 *
 * A response is a GraphQL response when its `Content-Type` is
 * `application/graphql-response+json`, whatever the status, or when it is
 * `application/json` and the body has a `data` or `errors` key. Anything else
 * is a `TransportError` with the response `status`, and a `Retry-After`
 * header (numeric or HTTP-date) becomes `retryAfter`.
 *
 * **Example** (Building a client over HTTP)
 *
 * ```ts import.meta.vitest
 * import { Effect, Layer, Schema } from "effect"
 * import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
 * import { HttpClient, HttpClientResponse } from "effect/http"
 *
 * const Viewer = GraphQL.query("Viewer", {
 *   document: "query Viewer{viewer{login}}",
 *   result: Schema.Struct({ viewer: Schema.Struct({ login: Schema.String }) })
 * })
 *
 * // A stand-in for a real HttpClient layer such as FetchHttpClient.layer
 * const FakeServer = Layer.succeed(
 *   HttpClient.HttpClient,
 *   HttpClient.make((request) =>
 *     Effect.succeed(HttpClientResponse.fromWeb(
 *       request,
 *       new Response(JSON.stringify({ data: { viewer: { login: "tim" } } }), {
 *         headers: { "content-type": "application/graphql-response+json" }
 *       })
 *     ))
 *   )
 * )
 *
 * const program = Effect.gen(function*() {
 *   const client = yield* GraphQLClient.make(GraphQLGroup.make(Viewer))
 *   return yield* client.Viewer()
 * }).pipe(
 *   Effect.provide(GraphQLProtocol.layerHttp({ url: "https://api.github.com/graphql" })),
 *   Effect.provide(FakeServer)
 * )
 *
 * await Effect.runPromise(program) // => { viewer: { login: "tim" } }
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.0.0
 */
export const layerHttp = (options: {
  readonly url: string
}): Layer.Layer<GraphQLProtocol, never, HttpClient.HttpClient> => Layer.effect(GraphQLProtocol, makeHttp(options))
