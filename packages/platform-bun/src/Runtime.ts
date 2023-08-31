/**
 * @since 1.0.0
 */

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
  defaultTeardown,
  /**
   * @since 1.0.0
   * @category runtime
   */
  runMain
} from "@effect/platform-node/Runtime"
