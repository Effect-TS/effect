import { List, MutableList } from "../definition"

/**
 * Returns a list of a given length that contains the specified value
 * in all positions.
 *
 * @complexity O(n)
 * @tsplus static ets/ListOps repeat
 */
export function repeat_<A>(value: A, times: number): List<A> {
  const mutableList = MutableList.emptyPushable<A>()
  while (--times >= 0) {
    mutableList.push(value)
  }
  return mutableList
}

/**
 * Returns a list of a given length that contains the specified value
 * in all positions.
 *
 * @complexity O(n)
 * @ets_data_first repeat_
 */
export function repeat(times: number): <A>(value: A) => List<A> {
  return (value) => List.repeat(value, times)
}
