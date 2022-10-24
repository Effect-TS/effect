import * as Context from "@fp-ts/data/Context"

/**
 * Flattens nested layers.
 *
 * @tsplus static effect/core/io/Layer.Aspects flatten
 * @tsplus pipeable effect/core/io/Layer flatten
 * @category sequencing
 * @since 1.0.0
 */
export function flatten<R2, E2, A>(tag: Context.Tag<Layer<R2, E2, A>>) {
  return <R, E>(self: Layer<R, E, Layer<R2, E2, A>>): Layer<R | R2, E | E2, A> =>
    self.flatMap(Context.get(tag))
}
