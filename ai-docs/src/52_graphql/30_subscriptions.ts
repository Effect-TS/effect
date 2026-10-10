/**
 * @title Subscriptions over graphql-ws and graphql-sse
 *
 * A subscription method returns a `Stream` of decoded events. The protocol
 * layer picks the transport: graphql-sse on `layerHttp`, graphql-ws on
 * `layerWebSocket`, or `POST` plus graphql-ws with `subscriptions.webSocket`.
 */
import { NodeSocket } from "@effect/platform-node"
import { Config, Context, Effect, Layer, Redacted, Schema, Stream } from "effect"
import { GraphQL, GraphQLClient, GraphQLGroup, GraphQLProtocol } from "effect/graphql"
import { FetchHttpClient } from "effect/http"

// GitHub has no subscriptions, so this example talks to a chat server. With a
// schema that declares a `Subscription` root, `graphqlgen` emits
// `GraphQL.subscription` values like this one for each `subscription` in a
// `.graphql` file.
export const MessageAdded = GraphQL.subscription("MessageAdded", {
  document: "subscription MessageAdded($roomId:ID!){messageAdded(roomId:$roomId){id body author{name}}}",
  variables: { roomId: Schema.String },
  result: Schema.Struct({
    messageAdded: Schema.Struct({
      id: Schema.String,
      body: Schema.String,
      author: Schema.Struct({ name: Schema.String })
    })
  })
})

export const SendMessage = GraphQL.mutation("SendMessage", {
  document: "mutation SendMessage($roomId:ID!,$body:String!){sendMessage(roomId:$roomId,body:$body){id}}",
  variables: { roomId: Schema.String, body: Schema.String },
  result: Schema.Struct({ sendMessage: Schema.Struct({ id: Schema.String }) })
})

// graphql-ws authenticates once per connection through `connectionParams`,
// because the protocol has no per-operation headers. The effect runs again on
// every connect, so a refreshed token is picked up after a reconnect.
const connectionParams = Effect.gen(function*() {
  const token = yield* Config.Redacted("CHAT_TOKEN")
  return { authorization: `Bearer ${Redacted.value(token)}` }
})

export class Chat extends Context.Service<Chat>()("app/Chat", {
  make: GraphQLClient.make(GraphQLGroup.make(MessageAdded, SendMessage), {
    // When the transport fails a subscription with a retryable
    // `TransportError` (a dropped connection, a 5xx, a non-fatal close code),
    // the client resubscribes on this schedule and reruns the middleware
    // chain. The default, `GraphQLClient.defaultSubscriptionRetry`, backs off
    // exponentially up to 5 seconds and honours the server's `retryAfter`.
    // Fatal errors, such as close code 4401 or a `ResponseError`, are never
    // retried.
    subscriptionRetry: GraphQLClient.defaultSubscriptionRetry
  })
}) {
  // graphql-sse distinct mode: each subscription is a `POST` with
  // `Accept: text/event-stream` to the same URL as queries. Headers set by
  // middleware or per call are sent with it, as for queries.
  static readonly layerSse = Layer.effect(Chat, Chat.make).pipe(
    Layer.provide(GraphQLProtocol.layerHttp({ url: "https://chat.example.com/graphql" })),
    Layer.provide(FetchHttpClient.layer)
  )

  // graphql-ws: every operation, queries and mutations included, is
  // multiplexed over one socket that opens on the first operation and closes
  // `idleTimeout` after the last one ends.
  static readonly layerWebSocket = Layer.effect(Chat, Chat.make).pipe(
    Layer.provide(GraphQLProtocol.layerWebSocket({
      url: "wss://chat.example.com/graphql",
      connectionParams,
      idleTimeout: "30 seconds"
    })),
    // In a browser, use `Socket.layerWebSocketConstructorGlobal` instead.
    Layer.provide(NodeSocket.layerWebSocketConstructor)
  )

  // Both: queries and mutations over `POST`, subscriptions over graphql-ws.
  static readonly layerSplit = Layer.effect(Chat, Chat.make).pipe(
    Layer.provide(GraphQLProtocol.layerHttp({
      url: "https://chat.example.com/graphql",
      subscriptions: { webSocket: { url: "wss://chat.example.com/graphql", connectionParams } }
    })),
    Layer.provide([FetchHttpClient.layer, NodeSocket.layerWebSocketConstructor])
  )
}

export const followRoom = Effect.gen(function*() {
  const chat = yield* Chat

  yield* chat.MessageAdded({ roomId: "general" }).pipe(
    // An event that carries `errors` fails the stream with a `ResponseError`;
    // subscriptions have no `partial` option. Interrupting the stream, here
    // after ten events, sends `complete` (graphql-ws) or aborts the request
    // (graphql-sse).
    Stream.take(10),
    Stream.runForEach(({ messageAdded }) => Effect.log(`${messageAdded.author.name}: ${messageAdded.body}`))
  )
})

// The same program runs over either transport; only the layer changes.
export const overWebSocket = followRoom.pipe(Effect.provide(Chat.layerWebSocket))
export const overSse = followRoom.pipe(Effect.provide(Chat.layerSse))
