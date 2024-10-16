/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcResolver from "@effect/rpc/RpcResolver"
import * as RpcRouter from "@effect/rpc/RpcRouter"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Queue from "effect/Queue"
import type * as RequestResolver from "effect/RequestResolver"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

class ClientRequest extends Schema.TaggedClass<ClientRequest>()("ClientRequest", {
  id: Schema.String,
  request: Schema.Unknown
}) {}

class ServerResponse extends Schema.TaggedClass<ServerResponse>()("ServerResponse", {
  id: Schema.String,
  response: Schema.Unknown
}) {}

const BroadcastMessage = Schema.Union(ClientRequest, ServerResponse)

/**
 * @since 1.0.0
 */
export const toBroadcastChannelRouter = <R extends RpcRouter.RpcRouter<any, any>>(self: R, channelId: string) => {
  const handler = RpcRouter.toHandlerNoStream(self)

  return Effect.gen(function*($) {
    const queue = yield* $(Queue.unbounded())
    yield* $(Effect.addFinalizer(() => Queue.shutdown(queue)))

    const channel = yield* $(Effect.acquireRelease(
      Effect.sync(() => {
        const channel = new BroadcastChannel(channelId)
        channel.onmessage = (event) => Queue.unsafeOffer(queue, event.data)
        return channel
      }),
      (channel) => Effect.sync(() => channel.close())
    ))

    yield* $(
      Queue.take(queue),
      Effect.flatMap(Schema.decodeUnknown(BroadcastMessage)),
      Effect.flatMap((message) =>
        message._tag === "ClientRequest" ?
          pipe(
            handler(message.request),
            Stream.mapEffect((response) =>
              pipe(
                Schema.encode(BroadcastMessage)(new ServerResponse({ id: message.id, response })),
                Effect.flatMap((reply) => Effect.sync(() => channel.postMessage(reply)))
              )
            ),
            Stream.runDrain,
            Effect.forkScoped
          ) :
          Effect.void
      ),
      Effect.forever
    )
  }).pipe(Effect.forkScoped)
}

/**
 * @since 1.0.0
 */
export const make = <R extends RpcRouter.RpcRouter<any, any>>(
  channelId: string
): RequestResolver.RequestResolver<
  Rpc.Request<RpcRouter.RpcRouter.Request<R>>,
  Schema.SerializableWithResult.Context<RpcRouter.RpcRouter.Request<R>>
> =>
  RpcResolver.make((requests) => {
    return Effect.gen(function*($) {
      const queue = yield* $(Queue.unbounded())
      yield* $(Effect.addFinalizer(() => Queue.shutdown(queue)))

      const channel = yield* $(Effect.acquireRelease(
        Effect.sync(() => {
          const channel = new BroadcastChannel(channelId)
          channel.onmessage = (event) => Queue.unsafeOffer(queue, event.data)

          return channel
        }),
        (channel) => Effect.sync(() => channel.close())
      ))

      return yield* $(
        Effect.sync(() => (Math.random() * 10000).toString(36)),
        Effect.flatMap((id) =>
          pipe(
            Schema.encode(BroadcastMessage)(new ClientRequest({ id, request: requests })),
            Effect.flatMap((message) => Effect.sync(() => channel.postMessage(message))),
            Effect.zipRight(pipe(
              Queue.take(queue),
              Effect.flatMap(Schema.decodeUnknown(BroadcastMessage)),
              Effect.repeat({
                until: (a): a is ServerResponse => a._tag == "ServerResponse" && a.id == id
              }),
              Effect.map((message) => message.response)
            ))
          )
        )
      )
    }).pipe(Effect.scoped)
  })<R>()
