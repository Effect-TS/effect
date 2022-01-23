import { pipe } from "../../Function"
import * as It from "../../Iterable"
import type * as O from "../../Option"
import type * as Ord from "../../Ord"
import * as ST from "../../Structural"
import * as RB from "./RedBlackTree"
import type * as Tp from "./Tuple"

export class SortedMap<K, V> implements Iterable<readonly [K, V]> {
  readonly _K!: () => K
  readonly _V!: () => V

  constructor(readonly tree: RB.RedBlackTree<K, V>) {}

  get [ST.hashSym](): number {
    return this.tree[ST.hashSym]
  }

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return this.tree[Symbol.iterator]()
  }

  [ST.equalsSym](that: unknown): boolean {
    return this.tree[ST.equalsSym](that)
  }
}

export interface Next<A> {
  readonly done?: boolean
  readonly value: A
}

export function make<K, V>(o: Ord.Ord<K>): SortedMap<K, V> {
  return new SortedMap<K, V>(RB.make(o))
}

export function get_<K, V>(map: SortedMap<K, V>, key: K): O.Option<V> {
  return RB.findFirst_(map.tree, key)
}

/**
 * @ets_data_first get_
 */
export function get<K>(key: K) {
  return <V>(map: SortedMap<K, V>) => get_(map, key)
}

export function remove_<K, V>(map: SortedMap<K, V>, key: K): SortedMap<K, V> {
  return new SortedMap(RB.removeFirst_(map.tree, key))
}

export function remove<K, V>(key: K) {
  return (map: SortedMap<K, V>) => remove_(map, key)
}

export function set_<K, V>(map: SortedMap<K, V>, key: K, value: V): SortedMap<K, V> {
  return new SortedMap(
    RB.has_(map.tree, key)
      ? pipe(map.tree, RB.removeFirst(key), RB.insert(key, value))
      : RB.insert_(map.tree, key, value)
  )
}

/**
 * @ets_data_first set_
 */
export function set<K, V>(key: K, value: V) {
  return (map: SortedMap<K, V>) => set_(map, key, value)
}

export function size<K, V>(map: SortedMap<K, V>): number {
  return RB.size(map.tree)
}

export function empty<K, V>(ord: Ord.Ord<K>): SortedMap<K, V> {
  return new SortedMap<K, V>(RB.make(ord))
}

export function isEmpty<K, V>(map: SortedMap<K, V>): boolean {
  return size(map) === 0
}

export function nonEmpty<K, V>(map: SortedMap<K, V>): boolean {
  return !isEmpty(map)
}

export function fromIterable_<K, V>(
  ord: Ord.Ord<K>,
  iterable: Iterable<readonly [K, V]>
): SortedMap<K, V> {
  return new SortedMap(RB.from(iterable, ord))
}

/**
 * @ets_data_first fromIterable_
 */
export function fromIterable<K>(ord: Ord.Ord<K>) {
  return <V>(iterable: Iterable<readonly [K, V]>) => fromIterable_(ord, iterable)
}

export function getOrd<K, V>(map: SortedMap<K, V>): Ord.Ord<K> {
  return map.tree.ord
}

export function headOption<K, V>(map: SortedMap<K, V>): O.Option<Tp.Tuple<[K, V]>> {
  return RB.getFirst(map.tree)
}

export function values<K, V>(map: SortedMap<K, V>): IterableIterator<V> {
  return RB.values_(map.tree)
}

export function keys<K, V>(map: SortedMap<K, V>): IterableIterator<K> {
  return RB.keys_(map.tree)
}

export function entries<K, V>(map: SortedMap<K, V>): Iterator<readonly [K, V]> {
  return map[Symbol.iterator]()
}

export function mapWithIndex_<K, V, A>(
  map: SortedMap<K, V>,
  f: (a: V, k: K) => A
): SortedMap<K, A> {
  return reduceWithIndex_(map, make<K, A>(getOrd(map)), (b, a, k) =>
    set_(b, k, f(a, k))
  )
}

/**
 * @ets_data_first mapWithIndex_
 */
export function mapWithIndex<K, V, A>(f: (a: V, k: K) => A) {
  return (map: SortedMap<K, V>) => mapWithIndex_(map, f)
}

export function reduceWithIndex_<K, V, A>(
  map: SortedMap<K, V>,
  b: A,
  f: (b: A, a: V, k: K) => A
) {
  return It.reduce_(map, b, (b, [k, a]) => f(b, a, k))
}

/**
 * @ets_data_first reduceWithIndex_
 */
export function reduceWithIndex<K, V, A>(b: A, f: (b: A, a: V, k: K) => A) {
  return (map: SortedMap<K, V>) => reduceWithIndex_(map, b, f)
}

export function reduce_<K, V, A>(map: SortedMap<K, V>, b: A, f: (b: A, a: V) => A) {
  return reduceWithIndex_(map, b, (z, a) => f(z, a))
}

/**
 * @ets_data_first reduce_
 */
export function reduce<K, V, A>(b: A, f: (b: A, a: V) => A) {
  return (map: SortedMap<K, V>) => reduce_(map, b, f)
}

export function map_<K, V, A>(map: SortedMap<K, V>, f: (a: V) => A): SortedMap<K, A> {
  return mapWithIndex_(map, (a: V, _) => f(a))
}

/**
 * @ets_data_first map_
 */
export function map<K, V, A>(f: (a: V) => A) {
  return (map: SortedMap<K, V>) => map_(map, f)
}
