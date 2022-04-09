/**
 * @tsplus type ets/RuntimeConfigFlags
 */
export interface RuntimeConfigFlags {
  readonly flags: HashSet<RuntimeConfigFlag>;
}

/**
 * @tsplus type ets/RuntimeConfigFlags/Ops
 */
export interface RuntimeConfigFlagsOps {
  $: RuntimeConfigFlagsAspects;
}
export const RuntimeConfigFlags: RuntimeConfigFlagsOps = {
  $: {}
};

/**
 * @tsplus type ets/RuntimeConfigFlags/Aspects
 */
export interface RuntimeConfigFlagsAspects {}

/**
 * @tsplus static ets/RuntimeConfigFlags/Ops __call
 */
export function apply(flags: HashSet<RuntimeConfigFlag>): RuntimeConfigFlags {
  return { flags };
}
