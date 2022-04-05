import { ILayerScoped } from "@effect-ts/core/io/Layer/definition";
import { environmentFor } from "@effect-ts/core/io/Layer/operations/_internal/environmentFor";

/**
 * Construct a service layer from a value
 *
 * @tsplus static ets/Layer/Ops fromValue
 */
export function fromValue<T>(service: Service<T>) {
  return (resource: LazyArg<T>): Layer<{}, never, Has<T>> =>
    Layer.suspend(
      new ILayerScoped(
        Effect.succeed(resource).flatMap((a) => environmentFor(service, a))
      ).setKey(service.identifier)
    );
}
