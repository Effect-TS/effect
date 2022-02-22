import { List, MutableList } from "../definition"

/**
 * Generates a new list by calling a function with the current index
 * `n` times.
 *
 * @complexity O(n)
 * @tsplus static ets/ListOps times
 */
export function times_<A>(f: (index: number) => A, times: number): List<A> {
  const mutableList = MutableList.emptyPushable<A>()
  for (let i = 0; i < times; i++) {
    mutableList.push(f(i))
  }
  return mutableList
}

/**
 * Generates a new list by calling a function with the current index
 * `n` times.
 *
 * @complexity O(n)
 * @ets_data_first times_
 */
export function times(times: number): <A>(func: (index: number) => A) => List<A> {
  return (func) => List.times(func, times)
}
