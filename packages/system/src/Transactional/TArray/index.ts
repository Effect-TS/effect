// ets_tracing: off

import { ArrayIndexOutOfBoundsException } from "../../GlobalExceptions/index.js"
import * as O from "../../Option/index.js"
import * as STM from "../STM/index.js"
import * as TRef from "../TRef/index.js"

export const TArrayTypeId = Symbol()
export type TArrayTypeId = typeof TArrayTypeId

export class TArray<A> {
  readonly _typeId: TArrayTypeId = TArrayTypeId
  constructor(readonly array: readonly TRef.TRef<A>[]) {}
}

/**
 * Makes a new `TArray` initialized with provided iterable.
 */
export function fromIterable<A>(it: Iterable<A>): STM.STM<unknown, never, TArray<A>> {
  return STM.map_(STM.forEach_(it, TRef.make), (as) => new TArray(as))
}

/**
 * Makes a new `TArray` that is initialized with specified values.
 */
export function make<ARGS extends any[]>(
  ...data: ARGS
): STM.STM<unknown, never, TArray<ARGS[number]>> {
  return fromIterable(data)
}

/**
 * Makes a new `TArray` that is initialized with specified values.
 */
export function empty<A>(): STM.STM<unknown, never, TArray<A>> {
  return fromIterable<A>([])
}

/**
 * Extracts value from ref in array.
 */
export function get_<A>(self: TArray<A>, index: number): STM.STM<unknown, never, A> {
  if (!Number.isInteger(index) || index < 0 || index >= self.array.length) {
    return STM.die(new ArrayIndexOutOfBoundsException(index))
  }
  return TRef.get(self.array[index]!)
}

/**
 * Extracts value from ref in array.
 *
 * @ets_data_first get_
 */
export function get(index: number): <A>(self: TArray<A>) => STM.STM<unknown, never, A> {
  return (self) => get_(self, index)
}

/**
 * Find the first element in the array matching a predicate.
 */
export function find_<A>(
  self: TArray<A>,
  p: (a: A) => boolean
): STM.STM<unknown, never, O.Option<A>> {
  return new STM.STMEffect((journal) => {
    let i = 0

    while (i < self.array.length) {
      const a = TRef.unsafeGet_(self.array[i]!, journal)
      if (p(a)) {
        return O.some(a)
      }
      i++
    }

    return O.none
  })
}

/**
 * Find the first element in the array matching a predicate.
 *
 * @ets_data_first find_
 */
export function find<A>(
  p: (a: A) => boolean
): (self: TArray<A>) => STM.STM<unknown, never, O.Option<A>> {
  return (self) => find_(self, p)
}

/**
 * Find the last element in the array matching a predicate.
 */
export function findLast_<A>(
  self: TArray<A>,
  p: (a: A) => boolean
): STM.STM<unknown, never, O.Option<A>> {
  return new STM.STMEffect((journal) => {
    let i = 0
    let res = O.emptyOf<A>()

    while (i < self.array.length) {
      const a = TRef.unsafeGet_(self.array[i]!, journal)
      if (p(a)) {
        res = O.some(a)
      }
      i++
    }

    return res
  })
}

/**
 * Find the last element in the array matching a predicate.
 *
 * @ets_data_first find_
 */
export function findLast<A>(
  p: (a: A) => boolean
): (self: TArray<A>) => STM.STM<unknown, never, O.Option<A>> {
  return (self) => findLast_(self, p)
}
