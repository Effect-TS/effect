/**
 * @tsplus getter effect/core/io/RuntimeFlags windDown
 */
export function windDown(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.WindDown)
}
