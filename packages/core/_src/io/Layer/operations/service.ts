/**
 * Constructs a layer that accesses and returns the specified service from the
 * environment.
 *
 * @tsplus static ets/Layer/Ops service
 */
export function service<T>(service: Service<T>): Layer<Has<T>, never, T> {
  return Layer.fromRawEffect(Effect.service(service));
}
