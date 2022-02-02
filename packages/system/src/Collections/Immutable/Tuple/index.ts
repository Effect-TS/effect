// ets_tracing: off

import * as Tp from "../../../Structural/index.js"
import type { ForcedArray } from "../../../Utils/index.js"

export const TupleSym: unique symbol = Symbol.for(
  "@effect-ts/system/Collections/Immutable/Tuple"
)
export type TupleSym = typeof TupleSym

export function isTuple(self: unknown): self is Tuple<unknown[]> {
  return typeof self === "object" && self != null && TupleSym in self
}

export class Tuple<T extends readonly unknown[]> implements Iterable<T[number]> {
  [TupleSym](): TupleSym {
    return TupleSym
  }

  constructor(readonly tuple: T) {}

  [Symbol.iterator](): IterableIterator<T[number]> {
    return this.tuple[Symbol.iterator]()
  }

  get [Tp.hashSym](): number {
    return Tp.hashArray(this.tuple)
  }

  [Tp.equalsSym](that: unknown): boolean {
    if (isTuple(that)) {
      return (
        this.tuple.length === that.tuple.length &&
        this.tuple.every((v, i) => Tp.equals(v, that.tuple[i]))
      )
    }
    return false
  }

  get<K extends keyof T>(i: K): T[K] {
    return this.tuple[i]
  }
}

/**
 * Creates a new Tuple
 */
export function tuple<Ks extends unknown[]>(...args: Ks): Tuple<Ks> {
  return new Tuple(args)
}

/**
 * Gets an element from the tuple
 *
 * @ets_data_first get_
 */
export function get<Ks extends unknown[], I extends keyof Ks>(
  i: I
): (self: Tuple<Ks>) => Ks[I] {
  return (self) => self.get(i)
}

/**
 * Gets an element from the tuple
 */
export function get_<Ks extends unknown[], I extends keyof Ks>(
  self: Tuple<Ks>,
  i: I
): Ks[I] {
  return self.get(i)
}

/**
 * Converts to native tuple type
 */
export function toNative<Ks extends readonly unknown[]>(self: Tuple<Ks>): Ks {
  return self.tuple
}

/**
 * Converts from native tuple type
 */
export function fromNative<Ks extends readonly unknown[]>(self: Ks): Tuple<Ks> {
  return new Tuple(self)
}

/**
 * Replaces the element in position I
 *
 * @ets_data_first update_
 */
export function update<Ks extends readonly unknown[], I extends keyof Ks & number, J>(
  i: I,
  f: (_: Ks[I]) => J
): (self: Tuple<Ks>) => Tuple<
  ForcedArray<{
    [k in keyof Ks]: k extends `${I}` ? J : Ks[k]
  }>
> {
  return (self) => update_(self, i, f)
}

/**
 * Replaces the element in position I
 */
export function update_<Ks extends readonly unknown[], I extends keyof Ks & number, J>(
  self: Tuple<Ks>,
  i: I,
  f: (_: Ks[I]) => J
): Tuple<
  ForcedArray<{
    [k in keyof Ks]: k extends `${I}` ? J : Ks[k]
  }>
> {
  const len = self.tuple.length
  const r = new Array(len)
  for (let k = 0; k < len; k++) {
    if (k === i) {
      r[k] = f(self.tuple[k])
    } else {
      r[k] = self.tuple[k]
    }
  }
  return new Tuple(r) as any
}

/**
 * Appends a value to a tuple
 *
 * @ets_data_first append_
 */
export function append<K>(
  k: K
): <Ks extends unknown[]>(self: Tuple<Ks>) => Tuple<[...Ks, K]> {
  return (self) => append_(self, k)
}

/**
 * Appends a value to a tuple
 */
export function append_<Ks extends unknown[], K>(
  self: Tuple<Ks>,
  k: K
): Tuple<[...Ks, K]> {
  return new Tuple([...self.tuple, k])
}

/**
 * Appends a value to a tuple
 *
 * @ets_data_first prepend_
 */
export function prepend<K>(
  k: K
): <Ks extends unknown[]>(self: Tuple<Ks>) => Tuple<[K, ...Ks]> {
  return (self) => prepend_(self, k)
}

/**
 * Prepends a value to a tuple
 */
export function prepend_<Ks extends unknown[], K>(
  self: Tuple<Ks>,
  k: K
): Tuple<[K, ...Ks]> {
  return new Tuple([k, ...self.tuple])
}

/**
 * Concat tuples
 *
 * @ets_data_first concat_
 */
export function concat<Hs extends unknown[]>(
  that: Tuple<Hs>
): <Ks extends unknown[]>(self: Tuple<Ks>) => Tuple<[...Ks, ...Hs]> {
  return (self) => concat_(self, that)
}

/**
 * Concat tuples
 */
export function concat_<Ks extends unknown[], Hs extends unknown[]>(
  self: Tuple<Ks>,
  that: Tuple<Hs>
): Tuple<[...Ks, ...Hs]> {
  return new Tuple([...self.tuple, ...that.tuple])
}
