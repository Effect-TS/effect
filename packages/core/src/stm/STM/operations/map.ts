import { STM } from "../definition"

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
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, E, B> {
  return (self) => self.map(f)
}
