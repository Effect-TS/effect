import { constTrue } from "@tsplus/stdlib/data/Function"

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runFold
 * @tsplus pipeable effect/core/stream/Stream runFold
 */
export function runFold<S, A>(
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R, E, S> =>
    Effect.scoped(
      self.runFoldWhileScoped(s, constTrue, f)
    )
}
