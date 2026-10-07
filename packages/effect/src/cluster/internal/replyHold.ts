import * as Context from "../../Context.ts"
import type * as Effect from "../../Effect.ts"
import type { MalformedMessage, PersistenceError } from "../ClusterError.ts"

/**
 * Parks the caller notification of a `WithExit` reply that is saved inside
 * its request's transaction. The entity manager provides a hold around that
 * save and runs the notification once the transaction has committed.
 *
 * @internal
 */
export interface ReplyHold {
  notify?: Effect.Effect<void, PersistenceError | MalformedMessage> | undefined
}

/**
 * @internal
 */
export const ReplyHold = Context.Reference<ReplyHold | undefined>("effect/cluster/internal/ReplyHold", {
  defaultValue: () => undefined
})
