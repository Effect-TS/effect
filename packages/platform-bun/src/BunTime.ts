/**
 * @since 1.0.0
 */
import * as NodeRuntime from "@effect/platform-node-shared/NodeRuntime"
import type { RunMain as FunTime } from "@effect/platform/Runtime"

/**
 * @since 1.0.0
 * @category funtime
 */
export const funTime: FunTime = NodeRuntime.runMain
