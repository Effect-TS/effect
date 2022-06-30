/**
 * @tsplus static effect/core/io/FiberRef.Ops unsafeMake
 */
export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): FiberRef<A, (a: A) => A> {
  return FiberRef.unsafeMakePatch<A, (a: A) => A>(
    initial,
    (_, newValue) => () => newValue,
    (first, second) => (value) => second(first(value)),
    (patch) => (value) => join(value, patch(value)),
    fork
  )
}
