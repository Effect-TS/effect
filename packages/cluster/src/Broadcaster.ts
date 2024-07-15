/**
 * @since 1.0.0
 */
import type { WithResult } from "@effect/schema/Serializable"
import type { Effect } from "effect/Effect"
import type { Either } from "effect/Either"
import type { HashMap } from "effect/HashMap"
import type { Envelope } from "./Envelope.js"
import type { PodAddress } from "./PodAddress.js"
import type { ShardingException } from "./ShardingException.js"

/**
 * A `Broadcaster` represents a component of the cluster that can communicate
 * with multiple remote entities by broadcasting messages to them.
 *
 * @since 1.0.0
 * @category models
 */
export interface Broadcaster<Msg extends Envelope.AnyMessage> {
  /**
   * Broadcast a message and wait for a response from each entity.
   *
   * @since 1.0.0
   * @category broadcasting
   */
  readonly broadcast: (topicId: string, message: Msg) => Effect<
    HashMap<
      PodAddress,
      Either<
        ShardingException | WithResult.Error<Msg>,
        WithResult.Success<Msg>
      >
    >,
    ShardingException
  >

  /**
   * Broadcast a message without waiting for a response from each entity.
   *
   * @since 1.0.0
   * @category broadcasting
   */
  readonly broadcastAndForget: (topicId: string, message: Msg) => Effect<
    void,
    ShardingException
  >
}
