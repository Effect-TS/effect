/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch isEmpty
 * @category elements
 * @since 1.0.0
 */
export function isEmpty(self: RuntimeFlags.Patch): boolean {
  return self.active === 0
}
