import type { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord"
import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * @since 2.0.0
 */
export function getStructSemigroup<O extends ReadonlyRecord<string, any>>(
  semigroups: {
    [K in keyof O]: Semigroup<O[K]>
  }
): Semigroup<O> {
  return {
    concat: (x, y) => {
      const r: any = {}
      for (const key of Object.keys(semigroups)) {
        r[key] = semigroups[key].concat(x[key], y[key])
      }
      return r
    }
  }
}
