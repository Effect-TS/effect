/**
 * Combines this differ and the specified differ to produce a new differ that
 * knows how to diff the product of their values.
 *
 * @tsplus static effect/core/io/Differ.Aspects zip
 * @tsplus pipeable effect/core/io/Differ zip
 */
export function zip<Value2, Patch2>(that: Differ<Value2, Patch2>) {
  return <Value, Patch>(
    self: Differ<Value, Patch>
  ): Differ<Tuple<[Value, Value2]>, Tuple<[Patch, Patch2]>> =>
    Differ.make({
      empty: Tuple(
        self.empty,
        that.empty
      ),
      combine: (first, second) =>
        Tuple(
          self.combine(first.get(0), second.get(0)),
          that.combine(first.get(1), second.get(1))
        ),
      diff: (oldValue, newValue) =>
        Tuple(
          self.diff(oldValue.get(0), newValue.get(0)),
          that.diff(oldValue.get(1), newValue.get(1))
        ),
      patch: (patch, oldValue) =>
        Tuple(
          self.patch(patch.get(0), oldValue.get(0)),
          that.patch(patch.get(1), oldValue.get(1))
        )
    })
}
