/**
 * Constructs a layer from this effect.
 *
 * @tsplus fluent ets/Effect toLayer
 */
export function toLayer_<R, E, A>(
  self: Effect<R, E, A>,
  service: Service<A>
): Layer<R, E, Has<A>> {
  return Layer.fromEffect(service)(self);
}

/**
 * Constructs a layer from this effect.
 *
 * @tsplus static ets/Effect/Aspects toLayer
 */
export function toLayer<A>(service: Service<A>) {
  return <R, E>(self: Effect<R, E, A>): Layer<R, E, Has<A>> => self.toLayer(service);
}
