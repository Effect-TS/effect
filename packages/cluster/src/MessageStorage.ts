/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type { EnvelopeWithContext } from "./Envelope.js"
import type { MessageState } from "./MessageState.js"
import type { MessagePersistenceError } from "./ShardingError.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface Service {
  /**
   * Save the provided envelope and its associated metadata.
   */
  readonly save: <R extends Rpc.Any>(
    envelope: EnvelopeWithContext<R>
  ) => Effect.Effect<void, MessagePersistenceError>

  /**
   * Updates the specified message using the provided `MessageState`.
   */
  readonly update: <R extends Rpc.Any>(
    envelope: EnvelopeWithContext<R>,
    state: MessageState<Rpc.SuccessExit<R>, Rpc.ErrorExit<R>>
  ) => Effect.Effect<void, MessagePersistenceError>

  /**
   * Retrieves the unprocessed messages for the specified entity and shard.
   */
  // readonly unprocessed: <Msg extends Envelope.AnyMessage>(
  //   entity: Entity<Msg>,
  //   shardId: ShardId
  // ) => Effect.Effect<Array<Envelope<Msg>>>
}

/**
 * @since 1.0.0
 * @category context
 */
export class MessageStorage extends Context.Tag("@effect/cluster/MessageStorage")<MessageStorage, Service>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerNoop: Layer.Layer<MessageStorage> = Layer.succeed(
  MessageStorage,
  MessageStorage.of({
    save: () => Effect.void,
    update: () => Effect.void
  })
)
