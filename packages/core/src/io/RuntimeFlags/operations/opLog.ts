/**
 * @tsplus getter effect/core/io/RuntimeFlags opLog
 */
export function opLog(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.OpLog)
}
