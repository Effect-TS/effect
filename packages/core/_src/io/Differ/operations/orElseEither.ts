/**
 * Combines this differ and the specified differ to produce a differ that
 * knows how to diff the sum of their values.
 *
 * @tsplus static effect/core/io/Differ.Aspects orElseEither
 * @tsplus pipeable effect/core/io/Differ orElseEither
 */
export function orElseEither<Value2, Patch2>(that: Differ<Value2, Patch2>) {
  return <Value, Patch>(
    self: Differ<Value, Patch>
  ): Differ<Either<Value, Value2>, Differ.OrPatch<Value, Value2, Patch, Patch2>> =>
    Differ.make({
      empty: Differ.OrPatch.empty(),
      combine: (first, second) => first.combine(second),
      diff: (oldValue, newValue) => Differ.OrPatch.diff(oldValue, newValue, self, that),
      patch: (patch, oldValue) => patch.apply(oldValue, self, that)
    })
}
