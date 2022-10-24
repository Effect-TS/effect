import { InternalTMap } from "@effect/core/stm/TMap/operations/_internal/InternalTMap"
import { pipe } from "@fp-ts/data/Function"
import * as List from "@fp-ts/data/List"

const INITIAL_CAPACITY = 16 as const

function nextPowerOfTwo(size: number): number {
  const n = -1 >>> Math.clz32(size - 1)

  return n < 0 ? 1 : n + 1
}

function allocate<K, V>(capacity: number, data: List.List<readonly [K, V]>): USTM<TMap<K, V>> {
  const buckets: Array<List.List<readonly [K, V]>> = Array.from(
    { length: capacity },
    () => List.nil()
  )
  const distinct = new Map<K, V>()

  pipe(data, List.forEach((kv) => distinct.set(kv[0], kv[1])))

  let size = 0

  for (const kv0 of distinct) {
    const kv = kv0
    const idx = TMap.indexOf(kv[0], capacity)

    buckets[idx] = pipe(buckets[idx]!, List.prepend(kv))

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
 * Makes a new `TMap` initialized with provided iterable.
 *
 * @tsplus static effect/core/stm/TMap.Ops fromIterable
 * @category constructors
 * @since 1.0.0
 */
export function fromIterable<K, V>(data: Iterable<readonly [K, V]>): USTM<TMap<K, V>> {
  return STM.suspend(() => {
    const data0 = Array.from(data)
    const size = data0.length
    const capacity = size < INITIAL_CAPACITY ? INITIAL_CAPACITY : nextPowerOfTwo(size)

    return allocate(capacity, List.fromIterable(data))
  })
}
