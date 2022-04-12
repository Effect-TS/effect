/**
 * Constructs a layer that accesses and returns the specified service from the
 * environment.
 *
 * @tsplus static ets/Layer/Ops service
 */
export function service<T>(tag: Tag<T>): Layer<Has<T>, never, Has<T>> {
  return Layer.fromEffect(tag)(Effect.service(tag));
}
