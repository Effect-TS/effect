import { concreteSortedMap } from "@tsplus/stdlib/collections/SortedMap/_internal/SortedMapInternal"

/**
 * A generator which chooses one of the given generators according to their
 * weights. For example, the following generator will generate 90% true and
 * 10% false values.
 *
 * @tsplus static effect/core/testing/Gen.Ops weighted
 */
export function weighted<R, A>(...gens: Array<Tuple<[Gen<R, A>, number]>>): Gen<R, A> {
  const sum = gens.reduce((acc, { tuple: [_, n] }) => acc + n, 0)
  const { tuple: [map, _] } = gens.reduce(
    ({ tuple: [map, acc] }, { tuple: [gen, d] }) =>
      (acc + d) / sum > acc / sum ?
        Tuple(map.set((acc + d) / sum, gen), acc + d) :
        Tuple(map, acc),
    Tuple(SortedMap.empty<number, Gen<R, A>>(Ord.number), 0)
  )
  return Gen.uniform().flatMap((n) =>
    getGreaterThanEqual(map, n).getOrElse(() => {
      throw new NoSuchElement()
    })
  )
}

function getGreaterThanEqual<K, V>(map: SortedMap<K, V>, key: K): Maybe<V> {
  concreteSortedMap(map)
  const cmp = map.tree.ord.compare
  let n = map.tree.root
  let lastValue = Maybe.empty<V>()
  while (n) {
    const d = cmp(key, n.key)
    if (d <= 0) {
      lastValue = Maybe.some(n.value)
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
