/**
 * @since 1.0.0
 */
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
  // TODO: refine signatures
  ask: (entityIdentifer: string, message: Msg) => Effect<void>
  tell: (entityIdentifer: string, message: Msg) => Effect<void>
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
