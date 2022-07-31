import { ILayerScoped } from "@effect/core/io/Layer/definition"

/**
 * Construct a service layer from a value
 *
 * @tsplus static effect/core/io/Layer.Ops fromValue
 */
export function fromValue<T, T1 extends T>(
  tag: Tag<T>,
  service: LazyArg<T1>
): Layer<never, never, T> {
  return Layer.suspend(new ILayerScoped(Effect.sync(service).map((service) => Env(tag, service))))
}
