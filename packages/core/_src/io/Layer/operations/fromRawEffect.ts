import { ILayerScoped } from "@effect/core/io/Layer/definition";

/**
 * Creates a layer from an effect.
 *
 * @tsplus static ets/Layer/Ops fromRawEffect
 */
export function fromRawEffect<R, E, A>(effect: Effect<R, E, A>): Layer<R, E, A> {
  return new ILayerScoped(effect);
}
