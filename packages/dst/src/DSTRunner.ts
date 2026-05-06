/**
 * DST Runner - Multi-seed test runner with profiling and failure shrinking.
 *
 * Iterates over a range of seeds, running each under deterministic
 * simulation. Optionally captures V8 CPU profiles and annotates with
 * git blame attribution.
 *
 * @since 0.1.0
 */

export type {
  /**
   * Configuration for a DST suite run.
   *
   * @since 0.1.0
   * @category models
   */
  DSTRunConfig,
  /**
   * Result of running a complete DST suite across multiple seeds.
   *
   * @since 0.1.0
   * @category models
   */
  DSTSuiteResult,
  /**
   * Result of a single seed run.
   *
   * @since 0.1.0
   * @category models
   */
  SeedResult
} from "./internal/dstRunner.js"

export {
  /**
   * Run DST across multiple seeds, collecting results.
   *
   * @since 0.1.0
   * @category execution
   */
  runSuite
} from "./internal/dstRunner.js"
