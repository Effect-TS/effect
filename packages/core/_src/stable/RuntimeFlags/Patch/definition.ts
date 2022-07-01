/**
 * @tsplus type effect/core/stable/RuntimeFlags/Patch
 */
export type Patch = number & {
  readonly Patch: unique symbol
}

/**
 * @tsplus type effect/core/stable/RuntimeFlags/Patch.ops
 */
export interface PatchOps {
  (active: number, enabled: number): Patch
}

export const Patch: PatchOps = function(active: number, enabled: number): Patch {
  return ((active << 0) + ((enabled & active) << 16)) as Patch
}
