/**
 * @tsplus type effect/core/io/RuntimeConfig/RuntimeConfigFlags
 */
export interface RuntimeConfigFlags {
  readonly flags: HashSet<RuntimeConfigFlag>
}

/**
 * @tsplus type effect/core/io/RuntimeConfig/RuntimeConfigFlags.Ops
 */
export interface RuntimeConfigFlagsOps {
  $: RuntimeConfigFlagsAspects
}
export const RuntimeConfigFlags: RuntimeConfigFlagsOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/RuntimeConfig/RuntimeConfigFlags.Aspects
 */
export interface RuntimeConfigFlagsAspects {}

/**
 * @tsplus static effect/core/io/RuntimeConfig/RuntimeConfigFlags.Ops __call
 */
export function apply(flags: HashSet<RuntimeConfigFlag>): RuntimeConfigFlags {
  return { flags }
}
