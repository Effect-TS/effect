/**
 * @tsplus getter effect/core/io/RuntimeFlags interruptible
 */
export function interruptible(self: RuntimeFlags): boolean {
  return self.interruption && !self.windDown
}
