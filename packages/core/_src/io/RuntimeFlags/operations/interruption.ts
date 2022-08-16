/**
 * @tsplus getter effect/core/io/RuntimeFlags interruption
 */
export function interruption(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.Interruption)
}
