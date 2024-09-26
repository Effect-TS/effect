/**
 * @since 1.0.0
 */
import type { WithResult } from "@effect/schema/Serializable"
import type { Effect } from "effect/Effect"
import type { Envelope } from "./Envelope.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Messenger")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Messenger<Msg extends Envelope.AnyMessage> extends Messenger.Proto {
  /**
   * Sends a message to an entity and waits for the result of processing the
   * message.
   */
  readonly ask: (entityId: string, message: Msg) => Effect<WithResult.Success<Msg>, WithResult.Failure<Msg>>
  /**
   * Sends a message to an entity without waiting for a response (i.e. fire and
   * forget).
   */
  readonly tell: (entityId: string, message: Msg) => Effect<void>
}

/**
 * @since 1.0.0
 */
export declare namespace Messenger {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [TypeId]: TypeId
  }
}
