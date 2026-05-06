/**
 * V8 CPU Profiling for Effect.
 *
 * Provides Effect-wrapped APIs for capturing V8 CPU profiles during
 * test execution. Profiles are saved in the standard `.cpuprofile`
 * format, compatible with Chrome DevTools and other profiling tools.
 *
 * @since 0.1.0
 */

export type {
  /**
   * A V8 CPU call frame.
   *
   * @since 0.1.0
   * @category models
   */
  CallFrame,
  /**
   * Metadata attached to a profile capture.
   *
   * @since 0.1.0
   * @category models
   */
  ProfileMetadata,
  /**
   * A node in the V8 CPU profile call tree.
   *
   * @since 0.1.0
   * @category models
   */
  ProfileNode,
  /**
   * Result of a profiled Effect execution.
   *
   * @since 0.1.0
   * @category models
   */
  ProfileResult,
  /**
   * A V8 CPU profile in the standard .cpuprofile format.
   *
   * @since 0.1.0
   * @category models
   */
  V8Profile
} from "./internal/v8Profiler.js"

export {
  /**
   * Capture a V8 CPU profile while executing an Effect.
   *
   * @since 0.1.0
   * @category profiling
   */
  captureProfile,
  /**
   * Compute self-time for each node from the samples/timeDeltas arrays.
   *
   * @since 0.1.0
   * @category profiling
   */
  computeSelfTimes,
  /**
   * Save a profile to disk as a .cpuprofile JSON file.
   *
   * @since 0.1.0
   * @category profiling
   */
  saveProfile
} from "./internal/v8Profiler.js"
