import { ILayerScoped } from "@effect-ts/core/io/Layer/definition";
import { environmentFor } from "@effect-ts/core/io/Layer/operations/_internal/environmentFor";

/**
 * Constructs a layer from the specified effect.
 *
 * @tsplus static ets/Layer/Ops fromEffect
 */
export function fromEffect<T>(service: Service<T>) {
  return <R, E>(effect: Effect<R, E, T>): Layer<R, E, Has<T>> => {
    return new ILayerScoped(effect.flatMap((a) => environmentFor(service, a) as UIO<Has<T>>)).setKey(
      service.identifier
    );
  };
}
