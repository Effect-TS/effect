/**
 * Constructs a layer that fails with the specified error.
 *
 * @tsplus static ets/Layer/Ops fail
 */
export function fail<E>(e: LazyArg<E>): Layer<never, E, unknown> {
  return Layer.failCause(Cause.fail(e()))
}
