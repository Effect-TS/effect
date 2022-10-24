import { NoSuchElementException } from "@effect/core/io/Cause"
import { pipe } from "@fp-ts/data/Function"
import * as number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import * as SortedMap from "@fp-ts/data/SortedMap"

/**
 * A generator which chooses one of the given generators according to their
 * weights. For example, the following generator will generate 90% true and
 * 10% false values.
 *
 * @tsplus static effect/core/testing/Gen.Ops weighted
 * @category constructors
 * @since 1.0.0
 */
export function weighted<R, A>(...gens: Array<readonly [Gen<R, A>, number]>): Gen<R, A> {
  const sum = gens.reduce((acc, [_, n]) => acc + n, 0)
  const [map, _] = gens.reduce(
    ([map, acc], [gen, d]) =>
      (acc + d) / sum > acc / sum ?
        [pipe(map, SortedMap.set((acc + d) / sum, gen)), acc + d] :
        [map, acc],
    [SortedMap.empty<number, Gen<R, A>>(number.Order), 0]
  )
  return Gen.uniform().flatMap((n) => {
    const option = getGreaterThanEqual(map, n)
    switch (option._tag) {
      case "None": {
        throw new NoSuchElementException()
      }
      case "Some": {
        return option.value
      }
    }
  })
}

function getGreaterThanEqual<K, V>(map: SortedMap.SortedMap<K, V>, key: K): Option.Option<V> {
  const cmp = SortedMap.getOrder(map).compare
  let n = ((map as any).tree as any).root
  let lastValue = Option.none as Option.Option<V>
  while (n) {
    const d = cmp(n.key)(key)
    if (d <= 0) {
      lastValue = Option.some(n.value)
      n = n.left
    } else {
      if (lastValue._tag === "Some") {
        break
      }
      n = n.right
    }
  }
  return lastValue
}
