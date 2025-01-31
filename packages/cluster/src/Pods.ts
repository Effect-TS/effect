/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Envelope from "./Envelope.js"
import type { PodAddress } from "./PodAddress.js"
import type * as Reply from "./Reply.js"
import type { ShardId } from "./ShardId.js"
import type { PodUnavailable } from "./ShardingError.js"
import { EntityNotManagedByPod, MalformedMessage } from "./ShardingError.js"

/**
 * @since 1.0.0
 * @category context
 */
export class Pods extends Context.Tag("@effect/cluster/Pods")<Pods, {
  /**
   * Checks if a pod is responsive.
   */
  readonly ping: (address: PodAddress) => Effect.Effect<void, PodUnavailable>

  /**
   * Send a message locally.
   *
   * This ensures that the message hits storage before being sent to the local
   * entity.
   */
  readonly sendLocal: <R extends Rpc.Any>(
    options: {
      readonly envelope: Envelope.EnvelopeWithContext<R>
      readonly send: <Rpc extends Rpc.Any>(
        message: Envelope.Envelope<Rpc>
      ) => Effect.Effect<void, EntityNotManagedByPod>
      readonly simulateRemoteSerialization: boolean
    }
  ) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage>

  /**
   * Send a message to a pod.
   */
  readonly send: <R extends Rpc.Any>(
    address: PodAddress,
    message: Envelope.EnvelopeWithContext<R>
  ) => Effect.Effect<void, EntityNotManagedByPod | MalformedMessage>

  /**
   * Send a reply back to the sender pod
   */
  readonly sendReply: <R extends Rpc.Any>(
    message: Reply.Reply<R>
  ) => Effect.Effect<void, MalformedMessage>

  /**
   * Notify a pod that it was assigned a set of shards.
   */
  readonly assignShards: (address: PodAddress, shards: Iterable<ShardId>) => Effect.Effect<void>

  /**
   * Notify a pod that it was unassigned a set of shards.
   */
  readonly unassignShards: (address: PodAddress, shards: Iterable<ShardId>) => Effect.Effect<void>
}>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: Omit<Pods["Type"], "sendLocal">): Pods["Type"] =>
  Pods.of({
    ...options,
    sendLocal(options) {
      if (!options.simulateRemoteSerialization) {
        return options.send(options.envelope)
      }
      return Envelope.serialize(options.envelope).pipe(
        Effect.flatMap((encoded) => Envelope.deserialize(options.envelope, encoded)),
        MalformedMessage.refail,
        Effect.flatMap(options.send)
      )
    }
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const layerNoop: Layer.Layer<Pods> = Layer.effect(
  Pods,
  Effect.gen(function*() {
    return make({
      send: (_, envelope) => Effect.fail(new EntityNotManagedByPod({ address: envelope.address })),
      sendReply: () => Effect.die(new Error("sendLocal not implemented")),
      ping: () => Effect.void,
      assignShards: () => Effect.void,
      unassignShards: () => Effect.void
    })
  })
)

// /**
//  * @since 1.0.0
//  * @category constructors
//  */
// export const withStorage = Effect.gen(function*() {
//   const protocol = yield* Pods
//   const storage = yield* MessageStorage
// })
