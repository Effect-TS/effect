/**
 * Transforms the type of values that this differ knows how to differ using
 * the specified functions that map the new and old value types to each other.
 *
 * @tsplus static effect/core/io/Differ.Aspects transform
 * @tsplus pipeable effect/core/io/Differ transform
 */
export function transform<Value, Value2>(f: (value: Value) => Value2, g: (value: Value2) => Value) {
  return <Patch>(self: Differ<Value, Patch>): Differ<Value2, Patch> =>
    Differ.make({
      empty: self.empty,
      combine: (first, second) => self.combine(first, second),
      diff: (oldValue, newValue) => self.diff(g(oldValue), g(newValue)),
      patch: (patch, oldValue) => f(self.patch(patch, g(oldValue)))
    })
}
