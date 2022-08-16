/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch isEmpty
 */
export function isEmpty(self: RuntimeFlags.Patch): boolean {
  return self.active === 0
}
