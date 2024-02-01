/**
 * @since 1.0.0
 */
import * as NodeRuntime from "@effect/platform-node-shared/NodeRuntime"
import type { RunMain } from "@effect/platform/Runtime"

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain: RunMain = NodeRuntime.runMain
