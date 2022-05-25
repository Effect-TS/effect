/**
 * Maps the output of this fiber to the specified constant value.
 *
 * @tsplus fluent ets/Fiber as
 * @tsplus fluent ets/RuntimeFiber as
 */
export function as_<E, A, B>(self: Fiber<E, A>, b: LazyArg<B>): Fiber<E, B> {
  return self.map(b)
}

/**
 * Maps the output of this fiber to the specified constant value.
 *
 * @tsplus static ets/Fiber/Aspects as
 */
export const as = Pipeable(as_)
