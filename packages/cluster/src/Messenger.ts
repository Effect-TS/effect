/**
 * @since 1.0.0
 */
import type { WithResult } from "@effect/schema/Serializable"
import type * as Effect from "effect/Effect"
import type { Envelope } from "./Envelope.js"
import type * as ShardingException from "./ShardingException.js"

/**
 * An interface to communicate with a remote entity.
 *
 * @tparam Msg the type of message that can be sent to this entity type
 * @since 1.0.0
 * @category models
 */
export interface Messenger<Msg extends Envelope.AnyMessage> {
  /**
   * Send a message without waiting for a response (fire and forget)
   *
   * You can use Effect timeout to get send timeouts. The default behaviour is to send the message indifinetely
   *
   * @since 1.0.0
   */
  sendDiscard(entityId: string): (message: Msg) => Effect.Effect<void, ShardingException.ShardingException>

  /**
   * Send a message and wait for a response.
   *
   * You can use Effect timeout to get send timeouts. The default behaviour is to send the message indifinetely
   *
   * @since 1.0.0
   */
  send(
    entityId: string
  ): <A extends Msg>(
    message: A
  ) => Effect.Effect<
    WithResult.Success<A>,
    ShardingException.ShardingException | WithResult.Error<A>
  >
}
