/**
 * Maps over the value the Fiber computes.
 *
 * @tsplus fluent ets/Fiber map
 * @tsplus fluent ets/RuntimeFiber map
 */
export function map_<E, A, B>(self: Fiber<E, A>, f: (a: A) => B): Fiber<E, B> {
  return self.mapEffect((a) => Effect.succeedNow(f(a)));
}

/**
 * Maps over the value the Fiber computes.
 *
 * @tsplus static ets/Fiber/Aspects map
 */
export const map = Pipeable(map_);
