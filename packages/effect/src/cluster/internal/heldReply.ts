import * as Context from "../../Context.ts"
import type * as Effect from "../../Effect.ts"
import type { MalformedMessage, PersistenceError } from "../ClusterError.ts"
import type { Snowflake } from "../Snowflake.ts"

/**
 * An open request transaction. Storage holds the caller delivery of the
 * request's `WithExit` reply here, and the transaction owner runs it once the
 * transaction has committed.
 *
 * @internal
 */
export interface HeldReply {
  readonly requestId: Snowflake
  delivery?: Effect.Effect<void, PersistenceError | MalformedMessage> | undefined
}

/**
 * @internal
 */
export const HeldReply = Context.Reference<HeldReply | undefined>("effect/cluster/internal/HeldReply", {
  defaultValue: () => undefined
})
