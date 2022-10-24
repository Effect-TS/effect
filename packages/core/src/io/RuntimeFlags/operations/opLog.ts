/**
 * @tsplus getter effect/core/io/RuntimeFlags opLog
 * @category getters
 * @since 1.0.0
 */
export function opLog(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.OpLog)
}
