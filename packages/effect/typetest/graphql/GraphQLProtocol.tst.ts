import { Context, Effect, type Layer, Stream } from "effect"
import { type GraphQL, GraphQLProtocol } from "effect/graphql"
import type { HttpClient } from "effect/http"
import type { Socket } from "effect/socket"
import { describe, expect, it } from "tstyche"

const GitHubHost = Context.Reference<string>("GitHubHost", { defaultValue: () => "api.github.com" })

type UrlFunction = (options: {
  readonly context: Context.Context<never>
  readonly kind: GraphQL.Kind
  readonly operationName: string
}) => string

const url: UrlFunction = ({ context }) => `https://${Context.get(context, GitHubHost)}/graphql`
const webSocket = { url: "wss://example.com/graphql" }

describe("GraphQLProtocol", () => {
  it("layerHttp and makeHttp accept a url function of the context, kind and operation name", () => {
    const layer = GraphQLProtocol.layerHttp({
      url: ({ context, kind, operationName }) => `https://${Context.get(context, GitHubHost)}/${kind}/${operationName}`
    })
    expect(layer).type.toBe<Layer.Layer<GraphQLProtocol.GraphQLProtocol, never, HttpClient.HttpClient>>()
    expect(GraphQLProtocol.makeHttp({ url, queryMethod: "GET" })).type.toBe<
      Effect.Effect<GraphQLProtocol.GraphQLProtocol["Service"], never, HttpClient.HttpClient>
    >()
  })

  it("a url function can't be combined with subscriptions.webSocket; a static url can", () => {
    expect(GraphQLProtocol.layerHttp).type.not.toBeCallableWith({ url, subscriptions: { webSocket } })
    expect(GraphQLProtocol.makeHttp).type.not.toBeCallableWith({ url, subscriptions: { webSocket } })
    expect(GraphQLProtocol.layerHttp({ url: "https://example.com/graphql", subscriptions: { webSocket } })).type.toBe<
      Layer.Layer<GraphQLProtocol.GraphQLProtocol, never, HttpClient.HttpClient | Socket.WebSocketConstructor>
    >()
  })

  it("the service has an optional url, so hand-written protocols without one still compile", () => {
    expect<GraphQLProtocol.GraphQLProtocol["Service"]["url"]>().type.toBe<UrlFunction | undefined>()
    expect(GraphQLProtocol.GraphQLProtocol.of).type.toBeCallableWith({
      execute: () => Effect.succeed({ body: null }),
      subscribe: () => Stream.empty
    })
  })
})
