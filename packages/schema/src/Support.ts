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
export interface Support extends Map<symbol, Function> {}

/**
 * @since 1.0.0
 */
export interface InterpreterSupport extends Map<symbol, Support> {}

/**
 * @since 1.0.0
 */
export const empty: InterpreterSupport = new Map()

/**
 * @since 1.0.0
 */
export const findSupport = <A>(
  supports: InterpreterSupport,
  interpreterId: symbol,
  typeId: symbol
): Option<A> =>
  pipe(
    O.fromNullable(supports.get(interpreterId)),
    O.flatMapNullable((supports) => supports.get(typeId) as any)
  )

/**
 * @since 1.0.0
 */
export const Semigroup: semigroup.Semigroup<InterpreterSupport> = semigroup.fromCombine((that) =>
  (self) => {
    const out = new Map(self)
    for (const [k, v] of that.entries()) {
      if (out.has(k)) {
        const sv = out.get(k)!
        out.set(k, new Map([...sv, ...v]))
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
export const Monoid: monoid.Monoid<InterpreterSupport> = monoid.fromSemigroup(Semigroup, empty)
