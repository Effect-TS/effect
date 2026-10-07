import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import type { MalformedMessage, PersistenceError } from "../ClusterError.ts"
import type { Snowflake } from "../Snowflake.ts"

/**
 * A request transaction. While it is open, storage holds the caller delivery
 * of the request's `WithExit` reply here, and the transaction owner runs it
 * once the transaction has committed. Fibers forked from the transaction can
 * outlive it, so replies saved after it closes are delivered immediately.
 *
 * @internal
 */
export interface HeldReply {
  readonly requestId: Snowflake
  open: boolean
  delivery?: Effect.Effect<void, PersistenceError | MalformedMessage> | undefined
}

/**
 * @internal
 */
export const HeldReply = Context.Reference<HeldReply | undefined>("effect/cluster/internal/HeldReply", {
  defaultValue: () => undefined
})

/**
 * Runs an effect without the current request transaction's hold, for work
 * that starts other handler attempts.
 *
 * @internal
 */
export const withoutHeldReply = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.provideService(effect, HeldReply, undefined)
