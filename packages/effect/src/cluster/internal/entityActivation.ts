import * as Context from "../../Context.ts"
import type * as Effect from "../../Effect.ts"
import type * as Latch from "../../Latch.ts"
import type * as Scope from "../../Scope.ts"
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
 * Active requests for the entity. Setting `exitWrites` on a persisted request
 * runs those writes in the same storage transaction as its `WithExit` reply.
 * @internal
 */
export class ActiveRequests extends Context.Service<
  ActiveRequests,
  ReadonlyMap<Snowflake, { exitWrites?: Effect.Effect<void> | undefined }>
>()("effect/cluster/internal/ActiveRequests") {}
