/**
 * @tsplus getter effect/core/io/RuntimeFlags opSupervision
 */
export function opSupervision(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.OpSupervision)
}
