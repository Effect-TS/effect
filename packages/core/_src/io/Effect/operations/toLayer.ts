/**
 * Constructs a layer from this effect.
 *
 * @tsplus fluent ets/Effect toLayer
 */
export function toLayer_<R, E, A>(
  self: Effect<R, E, A>,
  tag: Tag<A>
): Layer<R, E, Has<A>> {
  return Layer.fromEffect(tag)(self);
}

/**
 * Constructs a layer from this effect.
 *
 * @tsplus static ets/Effect/Aspects toLayer
 */
export function toLayer<A>(tag: Tag<A>) {
  return <R, E>(self: Effect<R, E, A>): Layer<R, E, Has<A>> => self.toLayer(tag);
}
