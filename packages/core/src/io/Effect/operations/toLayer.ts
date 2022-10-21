/**
 * Constructs a layer from this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects toLayer
 * @tsplus pipeable effect/core/io/Effect toLayer
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(self: Effect<R, E, A>): Layer<R, E, A> => Layer.fromEffect(tag)(self)
}
