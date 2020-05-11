import type { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord"

import { getStructSemigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export function getStructMonoid<O extends ReadonlyRecord<string, any>>(
  monoids: {
    [K in keyof O]: Monoid<O[K]>
  }
): Monoid<O> {
  const empty: any = {}
  for (const key of Object.keys(monoids)) {
    empty[key] = monoids[key].empty
  }
  return {
    concat: getStructSemigroup<O>(monoids).concat,
    empty
  }
}
