import { List, MutableList } from "../definition"

/**
 * Returns a list of numbers between an inclusive lower bound and an exclusive upper bound.
 *
 * @complexity O(n)
 * @tsplus static ets/ListOps range
 */
export function range_(start: number, end: number): List<number> {
  const mutableList = MutableList.emptyPushable<number>()
  for (let i = start; i < end; ++i) {
    mutableList.push(i)
  }
  return mutableList
}

/**
 * Returns a list of numbers between an inclusive lower bound and an exclusive upper bound.
 *
 * @complexity O(n)
 * @ets_data_first range_
 */
export function range(end: number): (start: number) => List<number> {
  return (start) => List.range(start, end)
}
