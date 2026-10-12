/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import { constFalse, constTrue } from "effect/Function"
import type { EntityId } from "./EntityId.js"

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Persisted extends Context.Reference<Persisted>()("@effect/cluster/ClusterSchema/Persisted", {
  defaultValue: constFalse
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class Uninterruptible
  extends Context.Reference<Uninterruptible>()("@effect/cluster/ClusterSchema/Uninterruptible", {
    defaultValue: (): boolean | "client" | "server" => false
  })
{
  /**
   * @since 1.0.0
   */
  static forServer(context: Context.Context<never>): boolean {
    const value = Context.get(context, Uninterruptible)
    return value === true || value === "server"
  }
  /**
   * @since 1.0.0
   */
  static forClient(context: Context.Context<never>): boolean {
    const value = Context.get(context, Uninterruptible)
    return value === true || value === "client"
  }
}

/**
 * Interrupts the request as soon as entity termination starts, instead of
 * waiting for `entityTerminationTimeout`. Defaults to `false`.
 *
 * Use for long-lived requests that never finish on their own. Persisted
 * requests resume on the next owner without saving the interrupt as a reply.
 * Non-persisted requests receive an interrupt exit. Server-side
 * `Uninterruptible` takes precedence.
 *
 * @since 1.0.0
 * @category Annotations
 */
export class InterruptOnTermination
  extends Context.Reference<InterruptOnTermination>()("@effect/cluster/ClusterSchema/InterruptOnTermination", {
    defaultValue: constFalse
  })
{}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class ShardGroup extends Context.Reference<ShardGroup>()("@effect/cluster/ClusterSchema/ShardGroup", {
  defaultValue: (): (entityId: EntityId) => string => (_) => "default"
}) {}

/**
 * @since 1.0.0
 * @category Annotations
 */
export class ClientTracingEnabled
  extends Context.Reference<ClientTracingEnabled>()("@effect/cluster/ClusterSchema/ClientTracingEnabled", {
    defaultValue: constTrue
  })
{}
