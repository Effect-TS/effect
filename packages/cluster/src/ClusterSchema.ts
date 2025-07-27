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
