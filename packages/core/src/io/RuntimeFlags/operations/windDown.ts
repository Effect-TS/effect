/**
 * @tsplus getter effect/core/io/RuntimeFlags windDown
 * @category getters
 * @since 1.0.0
 */
export function windDown(self: RuntimeFlags): boolean {
  return self.isEnabled(RuntimeFlags.WindDown)
}
