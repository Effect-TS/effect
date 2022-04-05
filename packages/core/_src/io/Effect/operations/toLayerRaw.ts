/**
 * Constructs a layer from this effect.
 *
 * @tsplus fluent ets/Effect toLayerRaw
 */
export function toLayerRaw<R, E, A>(self: Effect<R, E, A>): Layer<R, E, A> {
  return Layer.fromRawEffect(self);
}
