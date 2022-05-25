/**
 * A fiber that has already failed with the specified value.
 *
 * @tsplus static ets/Fiber/Ops fail
 */
export function fail<E>(e: E): Fiber<E, never> {
  return Fiber.done(Exit.fail(e))
}
