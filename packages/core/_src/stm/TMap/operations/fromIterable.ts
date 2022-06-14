import { InternalTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"

const INITIAL_CAPACITY = 16 as const

function nextPowerOfTwo(size: number): number {
  const n = -1 >>> Math.clz32(size - 1)

  return n < 0 ? 1 : n + 1
}

function allocate<K, V>(capacity: number, data: List<Tuple<[K, V]>>): USTM<TMap<K, V>> {
  const buckets: Array<List<Tuple<[K, V]>>> = Array.from({ length: capacity }, () => List.nil())
  const distinct = new Map<K, V>()

  data.forEach((kv) => distinct.set(kv.get(0), kv.get(1)))

  let size = 0

  for (const kv0 of distinct) {
    const kv = Tuple.fromNative(kv0)
    const idx = TMap.indexOf(kv.get(0), capacity)

    buckets[idx] = buckets[idx]!.prepend(kv)

    size += 1
  }

  return Do(($) => {
    const tArray = $(TArray.from(buckets))
    const tBuckets = $(TRef.make(tArray))
    const tSize = $(TRef.make(size))

    return new InternalTMap(tBuckets, tSize)
  })
}

/**
 * Retrieves value associated with given key.
 *
 * @tsplus static ets/TMap/Ops fromIterable
 */
export function fromIterable<K, V>(data0: Collection<Tuple<[K, V]>>): USTM<TMap<K, V>> {
  return STM.suspend(() => {
    const data = data0.toList()
    const size = data.length
    const capacity = size < INITIAL_CAPACITY ? INITIAL_CAPACITY : nextPowerOfTwo(size)

    return allocate(capacity, data)
  })
}
