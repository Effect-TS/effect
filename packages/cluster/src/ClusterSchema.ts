/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import { constFalse } from "effect/Function"

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
