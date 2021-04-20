import * as Tp from "../../../Structural"
import type { ForcedArray } from "../../../Utils"

export const TupleSym: unique symbol = Symbol.for(
  "@effect-ts/system/Collections/Immutable/Tuple"
)
export type TupleSym = typeof TupleSym

export function isTuple(self: unknown): self is Tuple<unknown[]> {
  return typeof self === "object" && self != null && TupleSym in self
}

export class Tuple<T extends readonly unknown[]> {
  [TupleSym](): TupleSym {
    return TupleSym
  }

  constructor(readonly tuple: T) {}

  [Tp.hashSym](): number {
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
 * @dataFirst get_
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
 * @dataFirst update_
 */
export function update<Ks extends readonly unknown[], I extends keyof Ks & number, J>(
  i: I,
  f: (_: Ks[I]) => J
): (
  self: Tuple<Ks>
) => Tuple<
  ForcedArray<
    {
      [k in keyof Ks]: k extends `${I}` ? J : Ks[k]
    }
  >
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
  ForcedArray<
    {
      [k in keyof Ks]: k extends `${I}` ? J : Ks[k]
    }
  >
> {
  const r = []
  for (let k = 0; k < self.tuple.length; k++) {
    if (k === i) {
      r[k] = f(self.tuple[k])
    } else {
      r[k] = self.tuple[k]
    }
  }
  return new Tuple(r) as any
}
