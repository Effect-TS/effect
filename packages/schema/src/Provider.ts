/**
 * @since 1.0.0
 */

import * as semigroup from "@fp-ts/core/typeclass/Semigroup"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export interface Services extends ReadonlyMap<unknown, Function> {}

/**
 * @since 1.0.0
 */
export interface Provider extends ReadonlyMap<unknown, Services> {}

/**
 * @since 1.0.0
 */
export const empty = (): Provider => new Map()

/**
 * @since 1.0.0
 */
export const make = (typeId: unknown, services: Record<string | symbol, Function>): Provider => {
  const entries: Array<[unknown, Services]> = []
  for (const serviceId of I.ownKeys(services)) {
    entries.push([serviceId, new Map([[typeId, services[serviceId]]])])
  }
  return new Map(entries)
}

/**
 * @since 1.0.0
 */
export const find = (
  serviceId: unknown,
  typeId: unknown
) =>
  (provider: Provider): Option<Function> =>
    pipe(
      O.fromNullable(provider.get(serviceId)),
      O.flatMapNullable((handlers) => handlers.get(typeId))
    )

/**
 * @since 1.0.0
 */
export const Semigroup: semigroup.Semigroup<Provider> = semigroup.fromCombine((that) =>
  (self) => {
    if (self.size === 0) {
      return that
    }
    if (that.size === 0) {
      return self
    }
    const out = new Map(self)
    for (const [serviceId, services] of that.entries()) {
      const found = out.get(serviceId)
      if (found !== undefined) {
        out.set(serviceId, new Map([...found, ...services]))
      } else {
        out.set(serviceId, services)
      }
    }
    return out
  }
)
