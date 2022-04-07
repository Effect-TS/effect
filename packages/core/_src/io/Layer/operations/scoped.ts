import { ILayerScoped } from "@effect/core/io/Layer/definition";
import { environmentFor } from "@effect/core/io/Layer/operations/_internal/environmentFor";

/**
 * Constructs a layer from the specified scoped effect.
 *
 * @tsplus static ets/Layer/Ops scoped
 */
export function scoped<T>(service: Service<T>) {
  return <R, E, A>(
    effect: LazyArg<Effect<R & HasScope, E, T>>,
    __tsplusTrace?: string
  ): Layer<R, E, Has<T>> =>
    Layer.suspend(
      new ILayerScoped(effect().flatMap((a) => environmentFor(service, a))).setKey(service.identifier)
    );
}
