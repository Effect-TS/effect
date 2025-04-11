/**
 * @since 1.0.0
 */
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Effect from "effect/Effect"
import { constant } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as Message from "./Message.js"
import * as MessageStorage from "./MessageStorage.js"
import * as Reply from "./Reply.js"
import * as Runners from "./Runners.js"
import * as Sharding from "./Sharding.js"
import { ShardingConfig } from "./ShardingConfig.js"
import * as ShardManager from "./ShardManager.js"
import * as ShardStorage from "./ShardStorage.js"
import * as SynchronizedClock from "./SynchronizedClock.js"

const constVoid = constant(Effect.void)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHandlers = Runners.Rpcs.toLayer(Effect.gen(function*() {
  const sharding = yield* Sharding.Sharding
  const storage = yield* MessageStorage.MessageStorage

  return {
    Ping: () => Effect.void,
    Notify: ({ envelope }) =>
      sharding.notify(
        envelope._tag === "Request"
          ? new Message.IncomingRequest({
            envelope,
            respond: constVoid,
            lastSentReply: Option.none()
          })
          : new Message.IncomingEnvelope({ envelope })
      ),
    Effect: ({ persisted, request }) => {
      let resume: (reply: Effect.Effect<Reply.ReplyEncoded<any>>) => void
      let replyEncoded: Reply.ReplyEncoded<any> | undefined
      const message = new Message.IncomingRequest({
        envelope: request,
        lastSentReply: Option.none(),
        respond(reply) {
          return Effect.flatMap(Reply.serialize(reply), (reply) => {
            if (resume) {
              resume(Effect.succeed(reply))
            } else {
              replyEncoded = reply
            }
            return Effect.void
          })
        }
      })
      return Effect.zipRight(
        persisted ?
          Effect.zipRight(
            storage.registerReplyHandler(message),
            sharding.notify(message)
          ) :
          sharding.send(message),
        Effect.async<Reply.ReplyEncoded<any>>((resume_) => {
          if (replyEncoded) {
            resume_(Effect.succeed(replyEncoded))
          } else {
            resume = resume_
          }
        })
      )
    },
    Stream: ({ persisted, request }) =>
      Effect.flatMap(
        Mailbox.make<Reply.ReplyEncoded<any>>(),
        (mailbox) => {
          const message = new Message.IncomingRequest({
            envelope: request,
            lastSentReply: Option.none(),
            respond(reply) {
              return Effect.flatMap(Reply.serialize(reply), (reply) => {
                mailbox.unsafeOffer(reply)
                return Effect.void
              })
            }
          })
          return Effect.as(
            persisted ?
              Effect.zipRight(
                storage.registerReplyHandler(message),
                sharding.notify(message)
              ) :
              sharding.send(message),
            mailbox
          )
        }
      ),
    Envelope: ({ envelope }) => sharding.send(new Message.IncomingEnvelope({ envelope }))
  }
}))

/**
 * The `RunnerServer` recieves messages from other Runners and forwards them to the
 * `Sharding` layer.
 *
 * It also responds to `Ping` requests.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  never,
  never,
  RpcServer.Protocol | Sharding.Sharding | MessageStorage.MessageStorage
> = RpcServer.layer(Runners.Rpcs, {
  spanPrefix: "RunnerServer",
  disableTracing: true
}).pipe(Layer.provide(layerHandlers))

/**
 * A `RunnerServer` layer that includes the `Runners` & `Sharding` clients.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerWithClients: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | RpcServer.Protocol
  | ShardingConfig
  | Runners.RpcClientProtocol
  | MessageStorage.MessageStorage
  | ShardStorage.ShardStorage
> = layer.pipe(
  Layer.provideMerge(Sharding.layer),
  Layer.provideMerge(Runners.layerRpc),
  Layer.provideMerge(SynchronizedClock.layer),
  Layer.provide(ShardManager.layerClientRpc)
)

/**
 * A `Runners` layer that is client only.
 *
 * It will not register with the ShardManager and recieve shard assignments,
 * so this layer can be used to embed a cluster client inside another effect
 * application.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerClientOnly: Layer.Layer<
  Sharding.Sharding | Runners.Runners,
  never,
  | ShardingConfig
  | Runners.RpcClientProtocol
  | MessageStorage.MessageStorage
> = Sharding.layer.pipe(
  Layer.provideMerge(Runners.layerRpc),
  Layer.provide(ShardManager.layerClientRpc),
  Layer.provide(ShardStorage.layerNoop),
  Layer.updateService(ShardingConfig, (config) => ({
    ...config,
    runnerAddress: Option.none()
  }))
)
