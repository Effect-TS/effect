/**
 * Maps the value produced by the effect.
 *
 * @tsplus fluent ets/STM map
 */
export function map_<R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, E, B> {
  return self.flatMap((a) => STM.succeedNow(f(a)))
}

/**
 * Maps the value produced by the effect.
 *
 * @tsplus static ets/STM/Aspects map
 */
export const map = Pipeable(map_)
