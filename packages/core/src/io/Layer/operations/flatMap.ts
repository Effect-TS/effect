import type { Context } from "@fp-ts/data/Context"

/**
 * Constructs a layer dynamically based on the output of this layer.
 *
 * @tsplus static effect/core/io/Layer.Aspects flatMap
 * @tsplus pipeable effect/core/io/Layer flatMap
 * @category sequencing
 * @since 1.0.0
 */
export function flatMap<A, R2, E2, A2>(f: (a: Context<A>) => Layer<R2, E2, A2>) {
  return <R, E>(self: Layer<R, E, A>): Layer<R | R2, E | E2, A2> =>
    self.foldLayer(
      (e) => Layer.fail(e),
      f
    )
}
