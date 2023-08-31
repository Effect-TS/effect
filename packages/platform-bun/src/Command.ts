/**
 * @since 1.0.0
 */

export type {
  /**
   * @since 1.0.0
   * @category model
   */
  Command,
  /**
   * @since 1.0.0
   * @category model
   */
  CommandInput,
  /**
   * @since 1.0.0
   * @category model
   */
  CommandOutput,
  /**
   * @since 1.0.0
   * @category model
   */
  PipedCommand,
  /**
   * @since 1.0.0
   * @category model
   */
  StandardCommand
} from "@effect/platform/Command"

export {
  /**
   * @since 1.0.0
   * @category combinators
   */
  env,
  /**
   * @since 1.0.0
   * @category execution
   */
  exitCode,
  /**
   * @since 1.0.0
   * @category combinators
   */
  feed,
  /**
   * @since 1.0.0
   * @category combinators
   */
  flatten,
  /**
   * @since 1.0.0
   * @category refinements
   */
  isCommand,
  /**
   * @since 1.0.0
   * @category execution
   */
  lines,
  /**
   * @since 1.0.0
   * @category constructors
   */
  make,
  /**
   * @since 1.0.0
   * @category combinators
   */
  pipeTo,
  /**
   * @since 1.0.0
   * @category execution
   */
  start,
  /**
   * @since 1.0.0
   * @category combinators
   */
  stderr,
  /**
   * @since 1.0.0
   * @category combinators
   */
  stdin,
  /**
   * @since 1.0.0
   * @category combinators
   */
  stdout,
  /**
   * @since 1.0.0
   * @category execution
   */
  stream,
  /**
   * @since 1.0.0
   * @category execution
   */
  streamLines,
  /**
   * @since 1.0.0
   * @category execution
   */
  string,
  /**
   * @since 1.0.0
   * @category combinators
   */
  workingDirectory
} from "@effect/platform/Command"
