import { filter } from "../Collections/Immutable/Chunk/api/filter"
import { splitAt } from "../Collections/Immutable/Chunk/api/splitAt"
import * as Ch from "../Collections/Immutable/Chunk/core"
import * as SortedMap from "../Collections/Immutable/SortedMap"
import * as Tp from "../Collections/Immutable/Tuple"
import type { Predicate } from "../Function"
import { not, pipe } from "../Function"
import * as It from "../Iterable"
import * as O from "../Option"
import type * as Ord from "../Ord"
import * as STM from "./STM"
import * as TRef from "./TRef"

export const TPriorityQueueTypeId = Symbol()
export type TPriorityQueueTypeId = typeof TPriorityQueueTypeId

export class TPriorityQueue<A> {
  readonly _typeId: TPriorityQueueTypeId = TPriorityQueueTypeId
  constructor(readonly map: TRef.TRef<SortedMap.SortedMap<A, Ch.Chunk<A>>>) {}
}

/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 */
export function make_<A>(
  ord: Ord.Ord<A>,
  ...data: Array<A>
): STM.USTM<TPriorityQueue<A>> {
  return fromIterable_(ord, data)
}

/**
 * Makes a new `TPriorityQueue` that is initialized with specified values.
 *
 * @ets_data_first make_
 */
export function make<A>(...data: Array<A>) {
  return (ord: Ord.Ord<A>) => make_(ord, ...data)
}

/**
 * Makes a new `TPriorityQueue` initialized with provided iterable.
 */
export function fromIterable_<A>(
  ord: Ord.Ord<A>,
  data: Iterable<A>
): STM.USTM<TPriorityQueue<A>> {
  return pipe(
    It.reduce_(data, SortedMap.empty<A, Ch.Chunk<A>>(ord), (map, a) =>
      SortedMap.set_(map, a, Ch.single(a))
    ),
    TRef.make,
    STM.map((as) => new TPriorityQueue(as))
  )
}

/**
 * Makes a new `TPriorityQueue` initialized with provided iterable.
 *
 * @ets_data_first fromIterable_
 */
export function fromIterable<A>(data: Iterable<A>) {
  return (ord: Ord.Ord<A>) => fromIterable_(ord, data)
}

/**
 * Constructs a new empty `TPriorityQueue` with the specified `Ordering`.
 */
export function empty<A>(ord: Ord.Ord<A>): STM.USTM<TPriorityQueue<A>> {
  return STM.map_(
    TRef.make(SortedMap.empty<A, Ch.Chunk<A>>(ord)),
    (as) => new TPriorityQueue(as)
  )
}

/**
 * Checks whether the queue is empty.
 */
export function isEmpty<A>(self: TPriorityQueue<A>): STM.USTM<boolean> {
  return STM.map_(TRef.get(self.map), SortedMap.isEmpty)
}

/**
 * Checks whether the queue is not empty..
 */
export function nonEmpty<A>(self: TPriorityQueue<A>): STM.USTM<boolean> {
  return STM.map_(TRef.get(self.map), SortedMap.nonEmpty)
}

/**
 * Offers the specified value to the queue.
 */
export function offer_<A>(self: TPriorityQueue<A>, a: A): STM.USTM<void> {
  return STM.map_(
    TRef.getAndUpdate_(self.map, SortedMap.set(a, Ch.single(a))),
    () => STM.unit
  )
}

/**
 * Offers the specified value to the queue.
 *
 * @ets_data_first offer_
 */
export function offer<A>(a: A) {
  return (self: TPriorityQueue<A>) => offer_(self, a)
}

/**
 * Offers all of the elements in the specified collection to the queue.
 */
export function offerAll_<A>(
  self: TPriorityQueue<A>,
  values: Iterable<A>
): STM.USTM<void> {
  return STM.map_(
    TRef.getAndUpdate_(self.map, (sa) =>
      It.reduce_(
        values,
        SortedMap.empty<A, Ch.Chunk<A>>(SortedMap.getOrd(sa)),
        (map, a) => SortedMap.set_(map, a, Ch.single(a))
      )
    ),
    () => STM.unit
  )
}

/**
 * Offers all of the elements in the specified collection to the queue.
 *
 * @ets_data_first offerAll_
 */
export function offerAll<A>(a: Iterable<A>) {
  return (self: TPriorityQueue<A>) => offerAll_(self, a)
}

/**
 * Peeks at the first value in the queue without removing it, retrying until a
 * value is in the queue.
 */
export function peek<A>(self: TPriorityQueue<A>): STM.USTM<A> {
  return new STM.STMEffect((journal) =>
    pipe(
      self.map,
      TRef.unsafeGet(journal),
      SortedMap.headOption,
      O.map(Tp.get(1)),
      O.chain(Ch.head),
      (o) => {
        if (o._tag === "None") {
          throw new STM.STMRetryException()
        }

        return o.value
      }
    )
  )
}

/**
 * Peeks at the first value in the queue without removing it, returning `None`
 * if there is not a value in the queue.
 */
export function peekOption<A>(self: TPriorityQueue<A>): STM.USTM<O.Option<A>> {
  return TRef.modify_(
    self.map,
    (map) =>
      [
        pipe(map, SortedMap.headOption, O.map(Tp.get(1)), O.chain(Ch.head)),
        map
      ] as const
  )
}

/**
 * Retains only elements from the queue matching the specified predicate.
 */
export function retainIf_<A>(self: TPriorityQueue<A>, p: Predicate<A>): STM.USTM<void> {
  return TRef.update_(self.map, SortedMap.map(filter(p)))
}

/**
 * Retains only elements from the queue matching the specified predicate.
 *
 * @ets_data_first retainIf_
 */
export function retainIf<A>(p: Predicate<A>) {
  return (self: TPriorityQueue<A>) => retainIf_(self, p)
}

/**
 * Removes all elements from the queue matching the specified predicate.
 */
export function removeIf_<A>(self: TPriorityQueue<A>, p: Predicate<A>) {
  return retainIf_(self, not(p))
}

/**
 * Removes all elements from the queue matching the specified predicate.
 *
 * @ets_data_first removeIf_
 */
export function removeIf<A>(p: Predicate<A>) {
  return (self: TPriorityQueue<A>) => removeIf_(self, p)
}

/**
 * Returns the size of the queue.
 */
export function size<A>(self: TPriorityQueue<A>): STM.USTM<number> {
  return TRef.modify_(self.map, (map) => [SortedMap.size(map), map] as const)
}

/**
 * Takes a value from the queue, retrying until a value is in the queue.
 */
export function take<A>(self: TPriorityQueue<A>): STM.USTM<A> {
  return new STM.STMEffect((journal) => {
    const map = TRef.unsafeGet_(self.map, journal)

    return pipe(
      map,
      SortedMap.headOption,
      O.chain((tp) => {
        const a = pipe(tp, Tp.get(1), Ch.tail, O.chain(O.fromPredicate(Ch.isNonEmpty)))
        const k = Tp.get_(tp, 0)

        TRef.unsafeSet_(
          self.map,
          a._tag === "None"
            ? SortedMap.remove_(map, k)
            : SortedMap.set_(map, k, a.value),
          journal
        )

        return Ch.head(Tp.get_(tp, 1))
      }),
      (o) => {
        if (o._tag === "None") {
          throw new STM.STMRetryException()
        }

        return o.value
      }
    )
  })
}

/**
 * Takes a value from the queue, returning `None` if there is not a value in
 * the queue.
 */
export function takeOption<A>(self: TPriorityQueue<A>): STM.USTM<O.Option<A>> {
  return new STM.STMEffect((journal) => {
    const map = TRef.unsafeGet_(self.map, journal)

    return pipe(
      map,
      SortedMap.headOption,
      O.chain((tp) => {
        const a = pipe(tp, Tp.get(1), Ch.tail, O.chain(O.fromPredicate(Ch.isNonEmpty)))
        const k = Tp.get_(tp, 0)

        TRef.unsafeSet_(
          self.map,
          a._tag === "None"
            ? SortedMap.remove_(map, k)
            : SortedMap.set_(map, k, a.value),
          journal
        )

        return Ch.head(Tp.get_(tp, 1))
      })
    )
  })
}

/**
 * Takes all values from the queue.
 */
export function takeAll<A>(self: TPriorityQueue<A>): STM.USTM<Ch.Chunk<A>> {
  return TRef.modify_(
    self.map,
    (map) => [SortedMap.reduce_(map, Ch.empty<A>(), Ch.concat_), map] as const
  )
}

/**
 * Takes up to the specified maximum number of elements from the queue.
 */
export function takeUpTo_<A>(
  self: TPriorityQueue<A>,
  n: number
): STM.USTM<Ch.Chunk<A>> {
  return TRef.modify_(self.map, (map) => {
    const entries = SortedMap.entries(map)
    const builder = Ch.builder<Ch.Chunk<A>>()
    let updated = map
    let e: SortedMap.Next<readonly [A, Ch.Chunk<A>]>
    let i = 0

    while (!(e = entries.next()).done) {
      const [a, as] = e.value
      const [l, r] = pipe(
        as,
        splitAt(n - i),
        (tp) => [Tp.get_(tp, 0), Tp.get_(tp, 1)] as const
      )

      builder.append(l)

      if (Ch.isEmpty(r)) {
        updated = SortedMap.remove_(updated, a)
      } else {
        updated = SortedMap.set_(updated, a, r)
      }

      i += Ch.size(l)
    }

    return [Ch.flatten(builder.build()), updated] as const
  })
}

/**
 * Takes up to the specified maximum number of elements from the queue.
 *
 * @ets_data_first takeUpTo_
 */
export function takeUpTo(n: number) {
  return <A>(self: TPriorityQueue<A>) => takeUpTo_(self, n)
}

/**
 * Collects all values into a chunk.
 */
export function toChunk<A>(self: TPriorityQueue<A>): STM.USTM<Ch.Chunk<A>> {
  return TRef.modify_(self.map, (map) => {
    const entries = SortedMap.entries(map)
    const builder = Ch.builder<Ch.Chunk<A>>()
    let e: SortedMap.Next<readonly [A, Ch.Chunk<A>]>

    while (!(e = entries.next()).done) {
      const [, as] = e.value

      builder.append(as)
    }

    return [Ch.flatten(builder.build()), map] as const
  })
}
