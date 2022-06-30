/**
 * Constructs a layer that accesses and returns the specified service from the
 * environment.
 *
 * @tsplus static effect/core/io/Layer.Ops service
 */
export function service<T>(tag: Tag<T>): Layer<T, never, T> {
  return Layer.fromEffect(tag, Effect.service(tag))
}
