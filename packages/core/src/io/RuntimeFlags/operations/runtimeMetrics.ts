/**
 * @tsplus getter effect/core/io/RuntimeFlags runtimeMetrics
 * @category getters
 * @since 1.0.0
 */
export function runtimeMetrics(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.RuntimeMetrics)
}
