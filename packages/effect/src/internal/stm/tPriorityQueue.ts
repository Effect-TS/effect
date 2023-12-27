import * as Chunk from "../../Chunk.js"
import { dual, pipe } from "../../Function.js"
import * as Option from "../../Option.js"
import type * as Order from "../../Order.js"
import type { Predicate } from "../../Predicate.js"
import * as ReadonlyArray from "../../ReadonlyArray.js"
import * as SortedMap from "../../SortedMap.js"
import type * as STM from "../../STM.js"
import type * as TPriorityQueue from "../../TPriorityQueue.js"
import type * as TRef from "../../TRef.js"
import * as core from "./core.js"
import * as tRef from "./tRef.js"

/** @internal */
const TPriorityQueueSymbolKey = "effect/TPriorityQueue"

/** @internal */
export const TPriorityQueueTypeId: TPriorityQueue.TPriorityQueueTypeId = Symbol.for(
  TPriorityQueueSymbolKey
) as TPriorityQueue.TPriorityQueueTypeId

const tPriorityQueueVariance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
export class TPriorityQueueImpl<in out A> implements TPriorityQueue.TPriorityQueue<A> {
  readonly [TPriorityQueueTypeId] = tPriorityQueueVariance
  constructor(readonly ref: TRef.TRef<SortedMap.SortedMap<A, [A, ...Array<A>]>>) {}
}

/** @internal */
export const empty = <A>(order: Order.Order<A>): STM.STM<never, never, TPriorityQueue.TPriorityQueue<A>> =>
  pipe(
    tRef.make(SortedMap.empty<A, [A, ...Array<A>]>(order)),
    core.map((ref) => new TPriorityQueueImpl(ref))
  )

/** @internal */
export const fromIterable =
  <A>(order: Order.Order<A>) => (iterable: Iterable<A>): STM.STM<never, never, TPriorityQueue.TPriorityQueue<A>> =>
    pipe(
      tRef.make(
        Array.from(iterable).reduce(
          (map, value) =>
            pipe(
              map,
              SortedMap.set(
                value,
                pipe(
                  map,
                  SortedMap.get(value),
                  Option.match({
                    onNone: () => ReadonlyArray.of(value),
                    onSome: ReadonlyArray.prepend(value)
                  })
                )
              )
            ),
          SortedMap.empty<A, [A, ...Array<A>]>(order)
        )
      ),
      core.map((ref) => new TPriorityQueueImpl(ref))
    )

/** @internal */
export const isEmpty = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, boolean> =>
  core.map(tRef.get(self.ref), SortedMap.isEmpty)

/** @internal */
export const isNonEmpty = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, boolean> =>
  core.map(tRef.get(self.ref), SortedMap.isNonEmpty)

/** @internal */
export const make =
  <A>(order: Order.Order<A>) => (...elements: Array<A>): STM.STM<never, never, TPriorityQueue.TPriorityQueue<A>> =>
    fromIterable(order)(elements)

/** @internal */
export const offer = dual<
  <A>(value: A) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>,
  <A>(self: TPriorityQueue.TPriorityQueue<A>, value: A) => STM.STM<never, never, void>
>(2, (self, value) =>
  tRef.update(self.ref, (map) =>
    SortedMap.set(
      map,
      value,
      Option.match(SortedMap.get(map, value), {
        onNone: () => ReadonlyArray.of(value),
        onSome: ReadonlyArray.prepend(value)
      })
    )))

/** @internal */
export const offerAll = dual<
  <A>(values: Iterable<A>) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>,
  <A>(self: TPriorityQueue.TPriorityQueue<A>, values: Iterable<A>) => STM.STM<never, never, void>
>(2, (self, values) =>
  tRef.update(self.ref, (map) =>
    Array.from(values).reduce(
      (map, value) =>
        SortedMap.set(
          map,
          value,
          Option.match(SortedMap.get(map, value), {
            onNone: () => ReadonlyArray.of(value),
            onSome: ReadonlyArray.prepend(value)
          })
        ),
      map
    )))

/** @internal */
export const peek = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, A> =>
  core.withSTMRuntime((runtime) => {
    const map = tRef.unsafeGet(self.ref, runtime.journal)
    return Option.match(
      SortedMap.headOption(map),
      {
        onNone: () => core.retry,
        onSome: (elements) => core.succeed(elements[0])
      }
    )
  })

/** @internal */
export const peekOption = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Option.Option<A>> =>
  tRef.modify(self.ref, (map) => [
    Option.map(SortedMap.headOption(map), (elements) => elements[0]),
    map
  ])

/** @internal */
export const removeIf = dual<
  <A>(predicate: Predicate<A>) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>,
  <A>(self: TPriorityQueue.TPriorityQueue<A>, predicate: Predicate<A>) => STM.STM<never, never, void>
>(2, (self, predicate) => retainIf(self, (a) => !predicate(a)))

/** @internal */
export const retainIf = dual<
  <A>(predicate: Predicate<A>) => (self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, void>,
  <A>(self: TPriorityQueue.TPriorityQueue<A>, predicate: Predicate<A>) => STM.STM<never, never, void>
>(
  2,
  <A>(self: TPriorityQueue.TPriorityQueue<A>, predicate: Predicate<A>) =>
    tRef.update(
      self.ref,
      (map) =>
        SortedMap.reduce(map, SortedMap.empty(SortedMap.getOrder(map)), (map, value, key) => {
          const filtered: ReadonlyArray<A> = ReadonlyArray.filter(value, predicate)
          return filtered.length > 0 ?
            SortedMap.set(map, key, filtered as [A, ...Array<A>]) :
            SortedMap.remove(map, key)
        })
    )
)

/** @internal */
export const size = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, number> =>
  tRef.modify(
    self.ref,
    (map) => [SortedMap.reduce(map, 0, (n, as) => n + as.length), map]
  )

/** @internal */
export const take = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, A> =>
  core.withSTMRuntime((runtime) => {
    const map = tRef.unsafeGet(self.ref, runtime.journal)
    return Option.match(SortedMap.headOption(map), {
      onNone: () => core.retry,
      onSome: (values) => {
        const head = values[1][0]
        const tail = values[1].slice(1)
        tRef.unsafeSet(
          self.ref,
          tail.length > 0 ?
            SortedMap.set(map, head, tail as [A, ...Array<A>]) :
            SortedMap.remove(map, head),
          runtime.journal
        )
        return core.succeed(head)
      }
    })
  })

/** @internal */
export const takeAll = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Array<A>> =>
  tRef.modify(self.ref, (map) => {
    const builder: Array<A> = []
    for (const entry of map) {
      builder.push(...entry[1])
    }
    return [builder, SortedMap.empty(SortedMap.getOrder(map))]
  })

/** @internal */
export const takeOption = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Option.Option<A>> =>
  core.effect<never, Option.Option<A>>((journal) => {
    const map = pipe(self.ref, tRef.unsafeGet(journal))
    return Option.match(SortedMap.headOption(map), {
      onNone: (): Option.Option<A> => Option.none(),
      onSome: ([key, value]) => {
        const tail = value.slice(1)
        tRef.unsafeSet(
          self.ref,
          tail.length > 0 ?
            SortedMap.set(map, key, tail as [A, ...Array<A>]) :
            SortedMap.remove(map, key),
          journal
        )
        return Option.some(value[0])
      }
    })
  })

/** @internal */
export const takeUpTo = dual<
  (n: number) => <A>(self: TPriorityQueue.TPriorityQueue<A>) => STM.STM<never, never, Array<A>>,
  <A>(self: TPriorityQueue.TPriorityQueue<A>, n: number) => STM.STM<never, never, Array<A>>
>(2, <A>(self: TPriorityQueue.TPriorityQueue<A>, n: number) =>
  tRef.modify(self.ref, (map) => {
    const builder: Array<A> = []
    const iterator = map[Symbol.iterator]()
    let updated = map
    let index = 0
    let next: IteratorResult<readonly [A, [A, ...Array<A>]], any>
    while ((next = iterator.next()) && !next.done && index < n) {
      const [key, value] = next.value
      const [left, right] = pipe(value, ReadonlyArray.splitAt(n - index))
      builder.push(...left)
      if (right.length > 0) {
        updated = SortedMap.set(updated, key, right as [A, ...Array<A>])
      } else {
        updated = SortedMap.remove(updated, key)
      }
      index = index + left.length
    }
    return [builder, updated]
  }))

/** @internal */
export const toChunk = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Chunk.Chunk<A>> =>
  tRef.modify(self.ref, (map) => {
    const builder: Array<A> = []
    for (const entry of map) {
      builder.push(...entry[1])
    }
    return [Chunk.unsafeFromArray(builder), map]
  })

/** @internal */
export const toArray = <A>(self: TPriorityQueue.TPriorityQueue<A>): STM.STM<never, never, Array<A>> =>
  tRef.modify(self.ref, (map) => {
    const builder: Array<A> = []
    for (const entry of map) {
      builder.push(...entry[1])
    }
    return [builder, map]
  })
