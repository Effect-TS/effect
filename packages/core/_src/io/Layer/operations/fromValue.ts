import { ILayerScoped } from "@effect/core/io/Layer/definition";

/**
 * Construct a service layer from a value
 *
 * @tsplus static ets/Layer/Ops fromValue
 */
export function fromValue<T>(tag: Tag<T>) {
  return (service: LazyArg<T>): Layer<unknown, never, Has<T>> =>
    Layer.suspend(new ILayerScoped(Effect.succeed(service).map((service) => Env(tag, service))));
}
