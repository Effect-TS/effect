/**
 * @tsplus static effect/core/io/Exit.Ops fail
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(error: E): Exit<E, never> {
  return Exit.failCause(Cause.fail(error))
}
