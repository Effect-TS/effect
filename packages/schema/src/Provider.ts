/**
 * @since 1.0.0
 */

import * as monoid from "@fp-ts/core/typeclass/Monoid"
import * as semigroup from "@fp-ts/core/typeclass/Semigroup"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Handlers extends Map<symbol, Function> {}

/**
 * @since 1.0.0
 */
export interface Provider extends Map<symbol, Handlers> {}

/**
 * @since 1.0.0
 */
export const empty: Provider = new Map()

/**
 * @since 1.0.0
 */
export const make = (typeId: symbol, providers: Record<symbol, Function>): Provider => {
  const handlers: Array<[symbol, Map<symbol, Function>]> = []
  for (const interpreterId of Object.getOwnPropertySymbols(providers)) {
    handlers.push([
      interpreterId,
      new Map<symbol, Function>([[typeId, providers[interpreterId]]])
    ])
  }
  return new Map(handlers)
}

/**
 * @since 1.0.0
 */
export const findHandler = (
  interpreterId: symbol,
  typeId: symbol
) =>
  (provider: Provider): Option<Function> =>
    pipe(
      O.fromNullable(provider.get(interpreterId)),
      O.flatMapNullable((handlers) => handlers.get(typeId))
    )

/**
 * @since 1.0.0
 */
export const Semigroup: semigroup.Semigroup<Provider> = semigroup.fromCombine((that) =>
  (self) => {
    if (self === empty || self.size === 0) {
      return that
    }
    if (that === empty || that.size === 0) {
      return self
    }
    const out = new Map(self)
    for (const [k, v] of that.entries()) {
      const found = out.get(k)
      if (found !== undefined) {
        out.set(k, new Map([...found, ...v]))
      } else {
        out.set(k, v)
      }
    }
    return out
  }
)

/**
 * @since 1.0.0
 */
export const Monoid: monoid.Monoid<Provider> = monoid.fromSemigroup(Semigroup, empty)

/**
 * @since 1.0.0
 */
export const replace = (from: symbol, to: symbol) =>
  (self: Provider): Provider => {
    const out = new Map(self)
    for (const [interpreterId, handlers] of self.entries()) {
      out.set(interpreterId, new Map(handlers))
      for (const [id, handler] of handlers.entries()) {
        if (id === from) {
          out.get(interpreterId)?.delete(from)
          out.get(interpreterId)?.set(to, handler)
        }
      }
    }
    return out
  }
