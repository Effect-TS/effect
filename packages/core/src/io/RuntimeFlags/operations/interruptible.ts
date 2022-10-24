/**
 * @tsplus getter effect/core/io/RuntimeFlags interruptible
 * @category getters
 * @since 1.0.0
 */
export function interruptible(self: RuntimeFlags): boolean {
  return self.interruption && !self.windDown
}
