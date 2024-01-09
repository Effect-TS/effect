/**
 * @since 1.0.0
 */
import type { RunMain } from "@effect/platform/Runtime"
import * as internal from "./internal/runtime.js"

export type {
  /**
   * @category model
   * @since 1.0.0
   */
  RunMain,
  /**
   * @category model
   * @since 1.0.0
   */
  Teardown
} from "@effect/platform/Runtime"

export {
  /**
   * @category teardown
   * @since 1.0.0
   */
  defaultTeardown
} from "@effect/platform/Runtime"

/**
 * @since 1.0.0
 * @category runtime
 */
export const runMain: RunMain = internal.runMain
