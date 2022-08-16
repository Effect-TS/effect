/**
 * @tsplus type effect/core/io/RuntimeFlags.Patch
 */
export type RuntimeFlagsPatch = number & {
  readonly RuntimeFlagsPatch: unique symbol
}

/**
 * @tsplus type effect/core/io/RuntimeFlags.Patch.Ops
 */
export interface RuntimeFlagsPatchOps {
  (active: number, enabled: number): RuntimeFlagsPatch
}
/**
 * @tsplus static effect/core/io/RuntimeFlags.Ops Patch
 */
export const Patch: RuntimeFlagsPatchOps = function(
  active: number,
  enabled: number
): RuntimeFlagsPatch {
  return ((active << 0) + ((enabled & active) << 16)) as RuntimeFlagsPatch
}
