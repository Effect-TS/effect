import * as Context from "../../Context.ts"
import type * as Effect from "../../Effect.ts"
import type * as Latch from "../../Latch.ts"
import type * as Scope from "../../Scope.ts"
import type { PersistenceError } from "../ClusterError.ts"
import type { Snowflake } from "../Snowflake.ts"

/** The entity lifetime, shared by all handler rebuilds within an activation. @internal */
export class CurrentActivationScope extends Context.Service<CurrentActivationScope, Scope.Scope>()(
  "effect/cluster/internal/CurrentActivationScope"
) {}

/** Opens when the activation retires and stops accepting new requests. @internal */
export class CurrentRetirementLatch extends Context.Service<CurrentRetirementLatch, Latch.Latch>()(
  "effect/cluster/internal/CurrentRetirementLatch"
) {}

/**
 * Writes attached to a persisted request's `WithExit` reply, keyed by request
 * id. They run after the reply is saved in the same storage transaction, so
 * they commit or roll back with it. @internal
 */
export class ExitReplyWrites extends Context.Service<
  ExitReplyWrites,
  Map<Snowflake, Effect.Effect<void, PersistenceError>>
>()("effect/cluster/internal/ExitReplyWrites") {}
