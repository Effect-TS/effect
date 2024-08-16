/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { Exit } from "effect/Exit"
import type { WithResult } from "effect/Schema"
import * as Envelope from "./Envelope.js"
import { MessageStorage } from "./MessageStorage.js"
import type { EntityNotManagedByPod } from "./ShardingError.js"
import { MalformedMessage } from "./ShardingError.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ShardingProtocolService {
  readonly sendLocal: <Msg extends Envelope.Envelope.AnyMessage>(
    options: {
      readonly envelope: Envelope.EnvelopeWithContext<Msg>
      readonly send: <Msg extends Envelope.Envelope.AnyMessage>(
        envelope: Envelope.Envelope<Msg>
      ) => Effect.Effect<Exit<WithResult.Success<Msg>, WithResult.Failure<Msg>>, EntityNotManagedByPod>
      readonly simulateRemoteSerialization: boolean
    }
  ) => Effect.Effect<Exit<WithResult.Success<Msg>, WithResult.Failure<Msg>>, EntityNotManagedByPod | MalformedMessage>
}

/**
 * @since 1.0.0
 * @category tags
 */
export class ShardingProtocol extends Context.Tag("@effect/cluster/ShardingProtocol")<
  ShardingProtocol,
  ShardingProtocolService
>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = (options: Omit<ShardingProtocolService, "sendLocal">): ShardingProtocolService =>
  ShardingProtocol.of({
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
export const withStorage = Effect.gen(function*() {
  const protocol = yield* ShardingProtocol
  const storage = yield* MessageStorage
})
