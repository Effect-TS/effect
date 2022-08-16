/**
 * @tsplus pipeable effect/core/io/RuntimeFlags patch
 */
export function patch(patch: RuntimeFlags.Patch) {
  return (self: RuntimeFlags): RuntimeFlags =>
    (
      (self & (~patch.active | patch.enabled)) |
      (patch.active & patch.enabled)
    ) as RuntimeFlags
}
