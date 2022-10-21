import { allFlags } from "@effect/core/io/RuntimeFlags/_internal/allFlags"
import type { RuntimeFlagsPatch } from "@effect/core/io/RuntimeFlags/patch/definition"

/**
 * @tsplus type effect/core/io/RuntimeFlags
 */
export type RuntimeFlags = number & {
  readonly RuntimeFlags: unique symbol
}

export namespace RuntimeFlags {
  export type Patch = RuntimeFlagsPatch
  /**
   * @tsplus type effect/core/io/RuntimeFlags.Flag
   */
  export type Flag = number & {
    readonly Flag: unique symbol
  }
}

/**
 * @tsplus type effect/core/io/RuntimeFlags.Ops
 */
export interface RuntimeFlagsOps {
  /**
   * No runtime flags.
   */
  readonly None: RuntimeFlags.Flag

  /**
   * The interruption flag determines whether or not the ZIO runtime system will
   * interrupt a fiber.
   */
  readonly Interruption: RuntimeFlags.Flag

  /**
   * The current fiber flag determines whether or not the ZIO runtime system
   * will store the current fiber inside a `ThreadLocal` whenever a fiber begins
   * executing on a thread. Use of this flag will negatively impact performance,
   * but is essential where interop with ThreadLocal is required.
   */
  readonly CurrentFiber: RuntimeFlags.Flag

  /**
   * The op log flag determines whether or not the ZIO runtime system will
   * attempt to log all operations of the ZIO runtime. Use of this flag will
   * negatively impact performance and generate massive volumes of ultra-fine
   * debug logs. Only recommended for debugging.
   */
  readonly OpLog: RuntimeFlags.Flag

  /**
   * The op supervision flag determines whether or not the ZIO runtime system
   * will supervise all operations of the ZIO runtime. Use of this flag will
   * negatively impact performance, but is required for some operations, such as
   * profiling.
   */
  readonly OpSupervision: RuntimeFlags.Flag

  /**
   * The runtime metrics flag determines whether or not the ZIO runtime system
   * will collect metrics about the ZIO runtime. Use of this flag will have a
   * very small negative impact on performance, but generates very helpful
   * operational insight into running ZIO applications that can be exported to
   * Prometheus or other tools via ZIO Metrics.
   */
  readonly RuntimeMetrics: RuntimeFlags.Flag

  /**
   * The fiber roots flag determines whether or not the ZIO runtime system will
   * keep track of all fiber roots. Use of this flag will negatively impact
   * performance, but is required for the fiber dumps functionality.
   */
  readonly FiberRoots: RuntimeFlags.Flag

  /**
   * The wind down flag determines whether the ZIO runtime system will execute
   * effects in wind-down mode. In wind-down mode, even if interruption is
   * enabled and a fiber has been interrupted, the fiber will continue its
   * execution uninterrupted.
   */
  readonly WindDown: RuntimeFlags.Flag

  /**
   * The cooperative yielding flag determines whether the ZIO runtime will yield
   * to another fiber.
   */
  readonly CooperativeYielding: RuntimeFlags.Flag

  /**
   * Apply
   */
  (...flags: RuntimeFlags.Flag[]): RuntimeFlags
}

export const RuntimeFlags: RuntimeFlagsOps = Object.assign(
  function(...flags: RuntimeFlags.Flag[]): RuntimeFlags {
    return (flags.reduce((a, b) => a | b, 0)) as RuntimeFlags
  },
  allFlags
)
