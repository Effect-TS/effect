/**
 * A `RuntimeConfig` provides the minimum capabilities necessary to bootstrap
 * execution of `Effect-TS` tasks.
 *
 * @tsplus type effect/core/io/RuntimeConfig
 */
export interface RuntimeConfig {
  readonly value: {
    readonly fatal: (defect: unknown) => boolean
    readonly reportFatal: (defect: unknown) => void
    readonly supervisor: Supervisor<unknown>
    readonly loggers: HashSet<Logger<string, unknown>>
    readonly flags: RuntimeConfigFlags
    readonly maxOp: number
  }
}

/**
 * @tsplus type effect/core/io/RuntimeConfig.Ops
 */
export interface RuntimeConfigOps {
  $: RuntimeConfigAspects
}
export const RuntimeConfig: RuntimeConfigOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/RuntimeConfig.Aspects
 */
export interface RuntimeConfigAspects {}
