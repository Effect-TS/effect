/**
 * Constructs a differ that knows how to diff `Env` values.
 *
 * @tsplus static effect/core/io/Differ.Ops environment
 */
export function environment<A>(): Differ<Service.Env<A>, Service.Patch<A, A>> {
  return Differ.make({
    empty: Service.Patch.empty(),
    combine: (first, second) => first.combine(second),
    diff: (oldValue, newValue) => Service.Patch.diff(oldValue, newValue),
    patch: (patch, oldValue) => patch.patch(oldValue)
  })
}
