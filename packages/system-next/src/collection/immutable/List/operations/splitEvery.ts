import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Splits the list into chunks of the given size.
 *
 * @ets fluent ets/List splitEvery
 */
export function splitEvery_<A>(self: List<A>, size: number): List<List<A>> {
  const { buffer, l2 } = self.reduce(
    {
      l2: MutableList.emptyPushable<List<A>>(),
      buffer: MutableList.emptyPushable<A>()
    },
    ({ buffer, l2 }, elm) => {
      buffer.push(elm)
      if (buffer.length === size) {
        return { l2: l2.push(buffer), buffer: MutableList.emptyPushable<A>() }
      } else {
        return { l2, buffer }
      }
    }
  )
  return buffer.length === 0 ? l2 : l2.push(buffer)
}

/**
 * Splits the list into chunks of the given size.
 *
 * @ets_data_first splitEvery_
 */
export function splitEvery(size: number) {
  return <A>(self: List<A>): List<List<A>> => self.splitEvery(size)
}
