/**
 * @since 1.0.0
 */
import type { WithResult } from "@effect/schema/Serializable"
import type { Effect } from "effect/Effect"
import type { Envelope } from "./Envelope.js"
import type { ShardingException } from "./ShardingException.js"

/**
 * A `Messenger` represents a component of the cluster that can communicate with
 * a remote entity by sending messages.
 *
 * @since 1.0.0
 * @category models
 */
export interface Messenger<Msg extends Envelope.AnyMessage> {
  /**
   * Sends a message to an entity and waits for the response.
   *
   * @since 1.0.0
   * @category messaging
   */
  ask(entityId: string, message: Msg): Effect<
    WithResult.Success<Msg>,
    ShardingException | WithResult.Error<Msg>
  >
  /**
   * Sends a message to an entity without waiting for the response.
   *
   * @since 1.0.0
   * @category messaging
   */
  fireAndForget(entityId: string, message: Msg): Effect<
    void,
    ShardingException | WithResult.Error<Msg>
  >
}
