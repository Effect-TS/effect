/**
 * @tsplus getter effect/core/io/RuntimeFlags opLog
 */
export function runtimeMetrics(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.RuntimeMetrics)
}
