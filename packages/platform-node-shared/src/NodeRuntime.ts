/**
 * @since 1.0.0
 */
import type { RunMain } from "@effect/platform/Runtime"
import * as internal from "./internal/runtime.js"

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain: RunMain = internal.runMain
