/**
 * Constructs a layer that fails with the specified error.
 *
 * @tsplus static effect/core/io/Layer.Ops fail
 */
export function fail<E>(e: LazyArg<E>): Layer<never, E, unknown> {
  return Layer.failCause(Cause.fail(e()))
}
