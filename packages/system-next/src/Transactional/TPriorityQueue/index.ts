import * as Chunk from "../../Collections/Immutable/Chunk"
import * as SortedMap from "../../Collections/Immutable/SortedMap"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { Predicate } from "../../Function"
import { pipe } from "../../Function"
import * as O from "../../Option"
import type * as Ord from "../../Ord"
import * as STM from "../STM"
import * as TRef from "../TRef"

export const TPriorityQueueTypeId = Symbol()
export type TPriorityQueueTypeId = typeof TPriorityQueueTypeId

export class TPriorityQueue<A> {
  readonly _typeId: TPriorityQueueTypeId = TPriorityQueueTypeId
  constructor(readonly map: TRef.TRef<SortedMap.SortedMap<A, Chunk.Chunk<A>>>) {}
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
  let map = SortedMap.empty<A, Chunk.Chunk<A>>(ord)

  for (const a of data) {
    map = SortedMap.set_(map, a, Chunk.single(a))
  }

  return STM.map_(TRef.make(map), (as) => new TPriorityQueue(as))
}

/**
 * @ets_data_first fromIterable_
 */
export function fromIterable<A>(data: Iterable<A>) {
  return (ord: Ord.Ord<A>) => fromIterable_(ord, data)
}

export function empty<A>(ord: Ord.Ord<A>): STM.USTM<TPriorityQueue<A>> {
  return STM.map_(
    TRef.make(SortedMap.empty<A, Chunk.Chunk<A>>(ord)),
    (as) => new TPriorityQueue(as)
  )
}

export function isEmpty<A>(self: TPriorityQueue<A>): STM.USTM<boolean> {
  return STM.map_(TRef.get(self.map), SortedMap.isEmpty)
}

export function nonEmpty<A>(self: TPriorityQueue<A>): STM.USTM<boolean> {
  return STM.map_(TRef.get(self.map), SortedMap.nonEmpty)
}

export function offer_<A>(self: TPriorityQueue<A>, a: A): STM.USTM<void> {
  return STM.map_(
    TRef.getAndUpdate_(self.map, SortedMap.set(a, Chunk.single(a))),
    () => STM.unit
  )
}

/**
 * @ets_data_first offer_
 */
export function offer<A>(a: A) {
  return (self: TPriorityQueue<A>) => offer_(self, a)
}

export function offerAll_<A>(
  self: TPriorityQueue<A>,
  values: Iterable<A>
): STM.USTM<void> {
  return STM.map_(
    TRef.getAndUpdate_(self.map, (sa) => {
      let map = SortedMap.empty<A, Chunk.Chunk<A>>(SortedMap.getOrd(sa))

      for (const a of values) {
        map = SortedMap.set_(map, a, Chunk.single(a))
      }

      return map
    }),
    () => STM.unit
  )
}

/**
 * @ets_data_first offerAll_
 */
export function offerAll<A>(a: Iterable<A>) {
  return (self: TPriorityQueue<A>) => offerAll_(self, a)
}

export function peek<A>(self: TPriorityQueue<A>): STM.USTM<A> {
  return new STM.STMEffect((journal) =>
    pipe(
      self.map,
      TRef.unsafeGet(journal),
      SortedMap.headOption,
      O.map(Tp.get(1)),
      O.chain(Chunk.head),
      (o) => {
        if (o._tag === "None") {
          throw new STM.STMRetryException()
        }

        return o.value
      }
    )
  )
}

export function peekOption<A>(self: TPriorityQueue<A>): STM.USTM<O.Option<A>> {
  return TRef.modify_(
    self.map,
    (map) =>
      [
        pipe(map, SortedMap.headOption, O.map(Tp.get(1)), O.chain(Chunk.head)),
        map
      ] as const
  )
}

export function retainIf_<A>(self: TPriorityQueue<A>, p: Predicate<A>): STM.USTM<void> {
  return TRef.update_(self.map, SortedMap.map(Chunk.filter(p)))
}

/**
 * @ets_data_first retainIf_
 */
export function retainIf<A>(p: Predicate<A>) {
  return (self: TPriorityQueue<A>) => retainIf_(self, p)
}

export function size<A>(self: TPriorityQueue<A>): STM.USTM<number> {
  return TRef.modify_(self.map, (map) => [SortedMap.size(map), map] as const)
}

export function take<A>(self: TPriorityQueue<A>): STM.USTM<A> {
  return new STM.STMEffect((journal) => {
    O.gen(function* (_) {})
    pipe(
      self.map,
      TRef.unsafeGet(journal),
      SortedMap.headOption,
      O.chain((tp) => {
        const a = pipe(tp, Tp.get(1), Chunk.tail)

        const map =
          a._tag === "None"
            ? SortedMap.remove_(self.map, Tp.get_(tp, 0))
            : SortedMap.set_(self.map, a.value)

        TRef.unsafeSet_(self.map, journal)

        return Chunk.head(Tp.get_(tp, 1))
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
