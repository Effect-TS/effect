import type { Context } from "@fp-ts/data/Context"
/**
 * Returns a new layer whose output is mapped by the specified function.
 *
 * @tsplus static effect/core/io/Layer.Aspects map
 * @tsplus pipeable effect/core/io/Layer map
 * @category mapping
 * @since 1.0.0
 */
export function map<A, B>(f: (a: Context<A>) => Context<B>) {
  return <R, E>(self: Layer<R, E, A>): Layer<R, E, B> =>
    self.flatMap(
      (a) => Layer.succeedEnvironment(f(a))
    )
}
